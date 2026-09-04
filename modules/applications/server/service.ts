import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { paginationMeta } from "@/schemas/shared";
import { requireStateScope } from "@/middleware/require-state-scope";
import { descendantUnitIds } from "@/lib/geo";
import type { AppUser } from "@/middleware/context";
import type { UserRole } from "@/modules/auth/schema";
import { applicationsRepository, UpdateApplicationData } from "./repository";
import {
  assertTransition,
  TERMINAL_STATUSES,
  VERIFICATION_TYPES,
} from "./state-machine";
import {
  ApplicationOutput,
  ApplicationStatus,
  CompletenessCheck,
  CompletenessOutput,
  GetApplicationInput,
  ListApplicationsInput,
  ListApplicationsOutput,
  ListQueueInput,
  CreateDraftApplicationInput,
  UpdateDraftApplicationInput,
  SubmitApplicationInput,
  CancelApplicationInput,
  ReviewActionInput,
  RequestCorrectionsInput,
  RejectApplicationInput,
  SetPriorityInput,
} from "../schema";

type Orm = typeof db.orm.public;
type ApplicationRow = NonNullable<Awaited<ReturnType<Orm["Application"]["first"]>>>;

const UNRESTRICTED_ROLES: readonly UserRole[] = ["SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"];
const SCOPED_ADMIN_ROLES: readonly UserRole[] = ["STATE_ADMIN", "DISTRICT_ADMIN"];
const ADMIN_ROLES: readonly UserRole[] = [...UNRESTRICTED_ROLES, ...SCOPED_ADMIN_ROLES];

function notFound(resourceId: string): never {
  throw new ORPCError("NOT_FOUND", { data: { resourceType: "Application", resourceId } });
}

function forbidden(reason: string): never {
  throw new ORPCError("FORBIDDEN", { data: { reason } });
}

function conflict(field: string, message: string): never {
  throw new ORPCError("CONFLICT", { data: { field, message } });
}

function validation(path: string, message: string): never {
  throw new ORPCError("VALIDATION_ERROR", { data: { issues: [{ path, message }] } });
}

function invalidState(current: ApplicationStatus, reason: string): never {
  throw new ORPCError("INVALID_STATE", { data: { currentState: current, reason } });
}

// ponytail: random suffix + uniqueness check is enough for the demo.
function generateApplicationCode(): string {
  const year = new Date().getFullYear();
  return `APP-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

async function nextApplicationCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateApplicationCode();
    const existing = await db.orm.public.Application.where({ applicationCode: code }).first();
    if (!existing) return code;
  }
  throw conflict("applicationCode", "Unable to allocate a unique application code");
}

function toOutput(row: ApplicationRow, instrumentCode: string): ApplicationOutput {
  return {
    id: row.id,
    applicationCode: row.applicationCode,
    instrumentId: row.instrumentId,
    instrumentCode,
    type: row.type,
    status: row.status,
    route: row.route,
    priority: row.priority,
    targetCertificateId: row.targetCertificateId,
    preferredStartAt: row.preferredStartAt,
    preferredEndAt: row.preferredEndAt,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function toOutputs(rows: ApplicationRow[]): Promise<ApplicationOutput[]> {
  const ids = [...new Set(rows.map((r) => r.instrumentId))];
  const instruments = ids.length
    ? await db.orm.public.Instrument.where((i) => i.id.in(ids)).all()
    : [];
  const codeById = new Map(instruments.map((i) => [i.id, i.instrumentCode]));
  return rows.map((r) => toOutput(r, codeById.get(r.instrumentId) ?? ""));
}

async function loadInstrumentFor(application: ApplicationRow) {
  const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
  if (!instrument) notFound(application.instrumentId);
  return instrument;
}

async function assertOwnerAccess(user: AppUser, application: ApplicationRow) {
  const instrument = await loadInstrumentFor(application);
  if (user.businessId !== instrument.businessId) {
    forbidden("Application does not belong to your business");
  }
}

async function assertAdminScope(user: AppUser, application: ApplicationRow) {
  const instrument = await loadInstrumentFor(application);
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return;
  if (SCOPED_ADMIN_ROLES.some((r) => user.roles.includes(r))) {
    await requireStateScope(user, instrument.administrativeUnitId);
    return;
  }
  forbidden("Not authorized to view this application");
}

async function assertCanView(user: AppUser, application: ApplicationRow) {
  if (user.roles.includes("INSTRUMENT_OWNER")) return assertOwnerAccess(user, application);
  if (ADMIN_ROLES.some((r) => user.roles.includes(r))) return assertAdminScope(user, application);
  forbidden("Not authorized to view this application");
}

async function scopedInstrumentIds(user: AppUser): Promise<Set<string> | null> {
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return null;
  const scopes = await db.orm.public.AdminScope.where({ userId: user.id }).all();
  if (scopes.length === 0) return new Set();
  return descendantUnitIds(scopes.map((s) => s.administrativeUnitId));
}

async function evaluateCompleteness(applicationId: string): Promise<CompletenessOutput> {
  const application = await db.orm.public.Application.first({ id: applicationId });
  if (!application) notFound(applicationId);
  const instrument = await loadInstrumentFor(application);

  const [hasAttachment, hasCertificate, targetCertificate] = await Promise.all([
    db.orm.public.Attachment.where({ instrumentId: instrument.id }).first(),
    db.orm.public.Certificate.where({ instrumentId: instrument.id }).first(),
    application.targetCertificateId
      ? db.orm.public.Certificate.first({ id: application.targetCertificateId })
      : Promise.resolve(null),
  ]);

  const checks: CompletenessCheck[] = [];
  const requiredFields = [
    instrument.manufacturer,
    instrument.model,
    instrument.serialNumber,
    instrument.capacity,
    instrument.accuracyClass,
    instrument.address,
    instrument.administrativeUnitId,
  ];
  checks.push({ label: "Instrument information complete", passed: requiredFields.every(Boolean) });
  checks.push({ label: "Instrument is active", passed: instrument.status !== "INACTIVE" });

  const start = application.preferredStartAt;
  const end = application.preferredEndAt;
  checks.push({ label: "Preferred appointment window valid", passed: !start || !end || start < end });

  if (VERIFICATION_TYPES.includes(application.type)) {
    checks.push({ label: "Supporting evidence uploaded", passed: !!hasAttachment });
  }
  if (["RE_VERIFICATION", "POST_REPAIR_VERIFICATION", "RELOCATION_RE_VERIFICATION"].includes(application.type)) {
    checks.push({ label: "Previous certificate available", passed: !!hasCertificate });
  }
  if (application.type === "CERTIFICATE_CORRECTION" || application.type === "DUPLICATE_CERTIFICATE") {
    const valid =
      !!application.targetCertificateId &&
      !!targetCertificate &&
      targetCertificate.instrumentId === instrument.id;
    checks.push({ label: "Target certificate valid", passed: valid });
  }

  return { complete: checks.every((c) => c.passed), checks };
}

async function applyStatusTransition(
  application: ApplicationRow,
  to: ApplicationStatus,
  changedById: string,
  reason: string | null,
  extra: UpdateApplicationData = {},
): Promise<void> {
  await db.transaction(async (tx) => {
    await applicationsRepository.update(application.id, { status: to, ...extra }, tx.orm);
    await applicationsRepository.createStatusHistory(
      {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: to,
        changedById,
        reason,
      },
      tx.orm,
    );
  });
}

export const applicationsService = {
  async fetchOutput(applicationId: string): Promise<ApplicationOutput> {
    const row = await db.orm.public.Application.first({ id: applicationId });
    if (!row) notFound(applicationId);
    const instrument = await db.orm.public.Instrument.first({ id: row.instrumentId });
    return toOutput(row, instrument?.instrumentCode ?? "");
  },

  async listMine(input: ListApplicationsInput, businessId: string | null): Promise<ListApplicationsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    if (!businessId) return { items: [], pagination: paginationMeta(0, page, limit) };

    const instrumentIds = (
      await db.orm.public.Instrument.where({ businessId }).select("id").all()
    ).map((i) => i.id);
    if (instrumentIds.length === 0) return { items: [], pagination: paginationMeta(0, page, limit) };

    let query = db.orm.public.Application.where((a) => a.instrumentId.in(instrumentIds));
    if (input.status) query = query.where({ status: input.status });
    if (input.type) query = query.where({ type: input.type });
    if (input.instrumentId) query = query.where({ instrumentId: input.instrumentId });

    const [rows, totals] = await Promise.all([
      query.orderBy((a) => a.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    return {
      items: await toOutputs(rows),
      pagination: paginationMeta(totals.total, page, limit),
    };
  },

  async listQueue(input: ListQueueInput, user: AppUser): Promise<ListApplicationsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const scopedIds = await scopedInstrumentIds(user);
    if (scopedIds !== null && scopedIds.size === 0) {
      return { items: [], pagination: paginationMeta(0, page, limit) };
    }

    let instrumentQuery = db.orm.public.Instrument;
    if (scopedIds !== null) {
      instrumentQuery = instrumentQuery.where((i) => i.administrativeUnitId.in([...scopedIds]));
    }
    if (input.districtId) {
      const districtIds = await descendantUnitIds([input.districtId]);
      instrumentQuery = instrumentQuery.where((i) => i.administrativeUnitId.in([...districtIds]));
    }
    const instrumentIds = (await instrumentQuery.select("id").all()).map((i) => i.id);
    if (instrumentIds.length === 0) return { items: [], pagination: paginationMeta(0, page, limit) };

    let query = db.orm.public.Application.where((a) => a.instrumentId.in(instrumentIds));
    if (input.status) query = query.where({ status: input.status });
    if (input.type) query = query.where({ type: input.type });
    if (input.priority) query = query.where({ priority: input.priority });

    const ascending = (input.sortOrder ?? "asc") === "asc";
    const sorted = ascending
      ? query.orderBy((a) => a.createdAt.asc())
      : query.orderBy((a) => a.createdAt.desc());

    const [rows, totals] = await Promise.all([
      sorted.offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    return {
      items: await toOutputs(rows),
      pagination: paginationMeta(totals.total, page, limit),
    };
  },

  async get(input: GetApplicationInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertCanView(user, application);
    return this.fetchOutput(input.id);
  },

  async completeness(input: GetApplicationInput, user: AppUser): Promise<CompletenessOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertCanView(user, application);
    return evaluateCompleteness(input.id);
  },

  async createDraft(input: CreateDraftApplicationInput, user: AppUser): Promise<ApplicationOutput> {
    if (!user.businessId) validation("businessId", "Create a business profile before applying");

    const instrument = await db.orm.public.Instrument.first({ id: input.instrumentId });
    if (!instrument) notFound(input.instrumentId);
    if (instrument.businessId !== user.businessId) {
      forbidden("Instrument does not belong to your business");
    }

    if (VERIFICATION_TYPES.includes(input.type)) {
      const open = await applicationsRepository.findOpenForInstrument(input.instrumentId);
      const conflicting = open.find(
        (a) => VERIFICATION_TYPES.includes(a.type) && !TERMINAL_STATUSES.includes(a.status),
      );
      if (conflicting) {
        conflict("instrumentId", "An open verification application already exists for this instrument");
      }
    }

    if (input.type === "CERTIFICATE_CORRECTION" || input.type === "DUPLICATE_CERTIFICATE") {
      if (!input.targetCertificateId) {
        validation("targetCertificateId", "A target certificate is required for this request type");
      }
      const certificate = await db.orm.public.Certificate.first({ id: input.targetCertificateId! });
      if (!certificate || certificate.instrumentId !== instrument.id) {
        validation("targetCertificateId", "Target certificate does not belong to this instrument");
      }
    }

    const applicationCode = await nextApplicationCode();
    const row = await applicationsRepository.create({
      applicationCode,
      instrumentId: input.instrumentId,
      type: input.type,
      status: "DRAFT",
      route: null,
      priority: "MEDIUM",
      targetCertificateId: input.targetCertificateId ?? null,
      requestedChanges: input.requestedChanges ?? null,
      preferredStartAt: input.preferredStartAt ?? null,
      preferredEndAt: input.preferredEndAt ?? null,
      submittedAt: null,
    });
    return this.fetchOutput(row.id);
  },

  async updateDraft(input: UpdateDraftApplicationInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertOwnerAccess(user, application);
    if (application.status !== "DRAFT" && application.status !== "DOCUMENTS_REQUIRED") {
      invalidState(application.status, "Only draft or correction-pending applications are editable");
    }

    const data: UpdateApplicationData = {};
    if (input.preferredStartAt !== undefined) data.preferredStartAt = input.preferredStartAt;
    if (input.preferredEndAt !== undefined) data.preferredEndAt = input.preferredEndAt;
    await applicationsRepository.update(input.id, data);

    return this.fetchOutput(input.id);
  },

  async submit(input: SubmitApplicationInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    const instrument = await loadInstrumentFor(application);
    if (user.businessId !== instrument.businessId) {
      forbidden("Application does not belong to your business");
    }

    assertTransition(application.status, "SUBMITTED", "OWNER");

    const completeness = await evaluateCompleteness(input.id);
    if (!completeness.complete) {
      throw new ORPCError("VALIDATION_ERROR", {
        data: {
          issues: completeness.checks
            .filter((c) => !c.passed)
            .map((c) => ({ path: "application", message: c.label })),
        },
      });
    }

    await db.transaction(async (tx) => {
      await applicationsRepository.update(
        input.id,
        { status: "SUBMITTED", submittedAt: new Date().toISOString() },
        tx.orm,
      );
      await applicationsRepository.createStatusHistory(
        {
          applicationId: input.id,
          fromStatus: application.status,
          toStatus: "SUBMITTED",
          changedById: user.id,
          reason: null,
        },
        tx.orm,
      );
      if (instrument.status === "REGISTERED") {
        await tx.orm.public.Instrument.where({ id: instrument.id }).update({ status: "PENDING_VERIFICATION" });
      }
    });

    return this.fetchOutput(input.id);
  },

  async cancel(input: CancelApplicationInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertOwnerAccess(user, application);
    assertTransition(application.status, "CANCELLED", "OWNER", input.reason);

    await applyStatusTransition(application, "CANCELLED", user.id, input.reason);
    return this.fetchOutput(input.id);
  },

  async startReview(input: ReviewActionInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertAdminScope(user, application);
    assertTransition(application.status, "UNDER_REVIEW", "ADMIN");

    await applyStatusTransition(application, "UNDER_REVIEW", user.id, input.notes ?? null);
    return this.fetchOutput(input.id);
  },

  async requestCorrections(input: RequestCorrectionsInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertAdminScope(user, application);
    assertTransition(application.status, "DOCUMENTS_REQUIRED", "ADMIN", input.reason);

    await applyStatusTransition(application, "DOCUMENTS_REQUIRED", user.id, input.reason);
    return this.fetchOutput(input.id);
  },

  async approve(input: ReviewActionInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertAdminScope(user, application);
    assertTransition(application.status, "APPROVED", "ADMIN");

    await applyStatusTransition(application, "APPROVED", user.id, input.notes ?? null);
    return this.fetchOutput(input.id);
  },

  async reject(input: RejectApplicationInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertAdminScope(user, application);
    assertTransition(application.status, "REJECTED", "ADMIN", input.reason);

    await applyStatusTransition(application, "REJECTED", user.id, input.reason);
    return this.fetchOutput(input.id);
  },

  async setPriority(input: SetPriorityInput, user: AppUser): Promise<ApplicationOutput> {
    const application = await db.orm.public.Application.first({ id: input.id });
    if (!application) notFound(input.id);
    await assertAdminScope(user, application);
    if (TERMINAL_STATUSES.includes(application.status)) {
      invalidState(application.status, "Priority cannot be changed on a closed application");
    }

    await applicationsRepository.update(input.id, { priority: input.priority });
    return this.fetchOutput(input.id);
  },
};
