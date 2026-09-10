import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { paginationMeta } from "@/schemas/shared";
import { requireStateScope } from "@/middleware/require-state-scope";
import { adminInstrumentIds } from "@/lib/scope";
import type { AppUser } from "@/middleware/context";
import type { UserRole } from "@/modules/auth/schema";
import { buildCanonicalPayload, hashPayload } from "./payload";
import {
  CertificateOutput,
  CertificateStatus,
  GetCertificateInput,
  IssueCertificateInput,
  ListCertificatesInput,
  ListCertificatesOutput,
  UpdateCertificateStatusInput,
} from "../schema";

type Orm = typeof db.orm.public;
type CertificateRow = NonNullable<Awaited<ReturnType<Orm["Certificate"]["first"]>>>;

const UNRESTRICTED_ROLES: readonly UserRole[] = ["SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"];
const SCOPED_ADMIN_ROLES: readonly UserRole[] = ["STATE_ADMIN", "DISTRICT_ADMIN"];
// Certificates in these states are the ones re-verification supersedes, and the
// only ones an authorized admin may suspend/cancel/revoke/supersede.
const ACTIVE_STATUSES: readonly CertificateStatus[] = ["ACTIVE", "EXPIRING_SOON"];

function notFound(resourceType: string, resourceId: string): never {
  throw new ORPCError("NOT_FOUND", { data: { resourceType, resourceId } });
}

function forbidden(reason: string): never {
  throw new ORPCError("FORBIDDEN", { data: { reason } });
}

function conflict(field: string, message: string): never {
  throw new ORPCError("CONFLICT", { data: { field, message } });
}

function invalidState(current: string, reason: string): never {
  throw new ORPCError("INVALID_STATE", { data: { currentState: current, reason } });
}

// ponytail: random suffix + uniqueness retry is enough for the demo.
async function nextCertificateCode(orm: Orm): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `CERT-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const existing = await orm.Certificate.where({ certificateCode: code }).first();
    if (!existing) return code;
  }
  throw conflict("certificateCode", "Unable to allocate a unique certificate code");
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

type UnitRef = { id: string; name: string; type: string; parentId: string | null };

function stateName(unitId: string, units: Map<string, UnitRef>): string | null {
  let cur = units.get(unitId);
  while (cur) {
    if (cur.type === "STATE") return cur.name;
    cur = cur.parentId ? units.get(cur.parentId) : undefined;
  }
  return null;
}

async function issuingAuthorityFor(unitId: string): Promise<string> {
  let unit = await db.orm.public.AdministrativeUnit.first({ id: unitId });
  while (unit && unit.type !== "STATE") {
    unit = unit.parentId ? await db.orm.public.AdministrativeUnit.first({ id: unit.parentId }) : null;
  }
  return unit ? `Legal Metrology Department, ${unit.name}` : "Legal Metrology Department";
}

async function toOutputs(rows: CertificateRow[]): Promise<CertificateOutput[]> {
  if (rows.length === 0) return [];
  const instrumentIds = [...new Set(rows.map((r) => r.instrumentId))];
  const [instruments, units] = await Promise.all([
    db.orm.public.Instrument.where((i) => i.id.in(instrumentIds)).all(),
    db.orm.public.AdministrativeUnit.select("id", "name", "type", "parentId").all(),
  ]);
  const typeIds = [...new Set(instruments.map((i) => i.instrumentTypeId))];
  const businessIds = [...new Set(instruments.map((i) => i.businessId))];
  const [types, businesses] = await Promise.all([
    db.orm.public.InstrumentType.where((t) => t.id.in(typeIds)).all(),
    db.orm.public.Business.where((b) => b.id.in(businessIds)).all(),
  ]);

  const instrumentById = new Map(instruments.map((i) => [i.id, i]));
  const typeById = new Map(types.map((t) => [t.id, t]));
  const businessById = new Map(businesses.map((b) => [b.id, b]));
  const unitById = new Map(units.map((u) => [u.id, u]));

  return rows.map((row) => {
    const instrument = instrumentById.get(row.instrumentId);
    const type = instrument ? typeById.get(instrument.instrumentTypeId) : undefined;
    const business = instrument ? businessById.get(instrument.businessId) : undefined;
    const state = instrument ? stateName(instrument.administrativeUnitId, unitById) : null;

    return {
      id: row.id,
      certificateCode: row.certificateCode,
      applicationId: row.applicationId,
      instrumentId: row.instrumentId,
      verifiedAt: row.verifiedAt,
      validUntil: row.validUntil,
      status: row.status,
      issuingAuthority: state ? `Legal Metrology Department, ${state}` : "Legal Metrology Department",
      payloadHash: row.payloadHash,
      ruleVersionId: row.ruleVersionId,
      fileId: row.fileId,
      qrUrl: `/verify/c/${encodeURIComponent(row.certificateCode)}`,
      createdAt: row.createdAt,
      instrument: {
        code: instrument?.instrumentCode ?? "",
        typeName: type?.name ?? "",
        unit: type?.unit ?? "",
        manufacturer: instrument?.manufacturer ?? "",
        model: instrument?.model ?? "",
        serialNumber: instrument?.serialNumber ?? "",
        capacity: instrument?.capacity ?? null,
        accuracyClass: instrument?.accuracyClass ?? null,
      },
      businessName: business?.businessName ?? "",
    };
  });
}

/** Instrument IDs visible to an admin, or null when unrestricted. */
// (adminInstrumentIds is shared in @/lib/scope)

async function hasActiveMembership(userId: string, gatcId: string): Promise<boolean> {
  const membership = await db.orm.public.GatcMembership.where({ userId, gatcId, isActive: true }).first();
  return !!membership;
}

/** Application IDs whose inspection this field user performed or is authorized for. */
async function fieldApplicationIds(user: AppUser): Promise<Set<string>> {
  const ids = new Set<string>();
  (await db.orm.public.Inspection.where({ performedById: user.id }).select("applicationId").all()).forEach((i) =>
    ids.add(i.applicationId),
  );
  if (user.roles.includes("LMO")) {
    const lmo = await db.orm.public.Lmo.where({ userId: user.id, isActive: true }).first();
    if (lmo) {
      (await db.orm.public.Inspection.where({ lmoId: lmo.id }).select("applicationId").all()).forEach((i) =>
        ids.add(i.applicationId),
      );
    }
  }
  const memberships = await db.orm.public.GatcMembership.where({ userId: user.id, isActive: true }).all();
  if (memberships.length > 0) {
    const gatcIds = memberships.map((m) => m.gatcId);
    (await db.orm.public.Inspection.where((i) => i.gatcId.in(gatcIds)).select("applicationId").all()).forEach((i) =>
      ids.add(i.applicationId),
    );
  }
  return ids;
}

async function assertFieldAuthority(user: AppUser, applicationId: string): Promise<boolean> {
  const inspection = await db.orm.public.Inspection.where({ applicationId }).first();
  if (inspection?.performedById === user.id) return true;
  if (user.roles.includes("LMO")) {
    const lmo = await db.orm.public.Lmo.where({ userId: user.id, isActive: true }).first();
    if (lmo && inspection?.lmoId === lmo.id) return true;
  }
  if (inspection?.gatcId && (await hasActiveMembership(user.id, inspection.gatcId))) return true;
  return false;
}

async function assertCanView(user: AppUser, instrument: NonNullable<Awaited<ReturnType<Orm["Instrument"]["first"]>>>, applicationId: string): Promise<void> {
  if (user.roles.includes("INSTRUMENT_OWNER")) {
    if (user.businessId !== instrument.businessId) forbidden("Certificate does not belong to your business");
    return;
  }
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return;
  if (SCOPED_ADMIN_ROLES.some((r) => user.roles.includes(r))) {
    await requireStateScope(user, instrument.administrativeUnitId);
    return;
  }
  if (await assertFieldAuthority(user, applicationId)) return;
  forbidden("Not authorized to view this certificate");
}

async function assertCanIssue(user: AppUser, instrument: NonNullable<Awaited<ReturnType<Orm["Instrument"]["first"]>>>, applicationId: string): Promise<void> {
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return;
  if (SCOPED_ADMIN_ROLES.some((r) => user.roles.includes(r))) {
    await requireStateScope(user, instrument.administrativeUnitId);
    return;
  }
  if (await assertFieldAuthority(user, applicationId)) return;
  forbidden("Not authorized to issue this certificate");
}

async function assertCanUpdateStatus(user: AppUser, instrument: NonNullable<Awaited<ReturnType<Orm["Instrument"]["first"]>>>): Promise<void> {
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return;
  if (SCOPED_ADMIN_ROLES.some((r) => user.roles.includes(r))) {
    await requireStateScope(user, instrument.administrativeUnitId);
    return;
  }
  forbidden("Not authorized to change certificate status");
}

export const certificatesService = {
  async listMine(input: ListCertificatesInput, user: AppUser): Promise<ListCertificatesOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    if (!user.businessId) return { items: [], pagination: paginationMeta(0, page, limit) };

    const instrumentIds = (
      await db.orm.public.Instrument.where({ businessId: user.businessId }).select("id").all()
    ).map((i) => i.id);
    if (instrumentIds.length === 0) return { items: [], pagination: paginationMeta(0, page, limit) };

    let query = db.orm.public.Certificate.where((c) => c.instrumentId.in(instrumentIds));
    if (input.status) query = query.where({ status: input.status });
    if (input.instrumentId) query = query.where({ instrumentId: input.instrumentId });

    const [rows, totals] = await Promise.all([
      query.orderBy((c) => c.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    return { items: await toOutputs(rows), pagination: paginationMeta(totals.total, page, limit) };
  },

  async list(input: ListCertificatesInput, user: AppUser): Promise<ListCertificatesOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const instrumentIds = await adminInstrumentIds(user);
    if (instrumentIds !== null && instrumentIds.size === 0) {
      return { items: [], pagination: paginationMeta(0, page, limit) };
    }

    let query = db.orm.public.Certificate;
    if (instrumentIds !== null) query = query.where((c) => c.instrumentId.in([...instrumentIds]));
    if (input.status) query = query.where({ status: input.status });
    if (input.instrumentId) query = query.where({ instrumentId: input.instrumentId });

    const [rows, totals] = await Promise.all([
      query.orderBy((c) => c.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    return { items: await toOutputs(rows), pagination: paginationMeta(totals.total, page, limit) };
  },

  async listField(input: ListCertificatesInput, user: AppUser): Promise<ListCertificatesOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const applicationIds = await fieldApplicationIds(user);
    if (applicationIds.size === 0) return { items: [], pagination: paginationMeta(0, page, limit) };

    let query = db.orm.public.Certificate.where((c) => c.applicationId.in([...applicationIds]));
    if (input.status) query = query.where({ status: input.status });
    if (input.instrumentId) query = query.where({ instrumentId: input.instrumentId });

    const [rows, totals] = await Promise.all([
      query.orderBy((c) => c.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    return { items: await toOutputs(rows), pagination: paginationMeta(totals.total, page, limit) };
  },

  async get(input: GetCertificateInput, user: AppUser): Promise<CertificateOutput> {
    const row =
      (await db.orm.public.Certificate.where({ certificateCode: input.id }).first()) ??
      (await db.orm.public.Certificate.first({ id: input.id }));
    if (!row) notFound("Certificate", input.id);

    const instrument = await db.orm.public.Instrument.first({ id: row.instrumentId });
    if (!instrument) notFound("Instrument", row.instrumentId);
    await assertCanView(user, instrument, row.applicationId);

    const [output] = await toOutputs([row]);
    return output;
  },

  async issue(input: IssueCertificateInput, user: AppUser): Promise<CertificateOutput> {
    const application = await db.orm.public.Application.first({ id: input.applicationId });
    if (!application) notFound("Application", input.applicationId);
    if (application.status !== "PASSED") {
      invalidState(application.status, "A certificate can only be issued after a passing inspection");
    }

    const existing = await db.orm.public.Certificate.where({ applicationId: application.id }).first();
    if (existing) conflict("applicationId", "A certificate has already been issued for this application");

    const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
    if (!instrument) notFound("Instrument", application.instrumentId);
    await assertCanIssue(user, instrument, application.id);

    const inspection = await db.orm.public.Inspection.where({ applicationId: application.id }).first();
    if (!inspection || inspection.result !== "PASS") {
      invalidState(application.status, "No passing inspection recorded for this application");
    }

    const rule = inspection.ruleVersionId
      ? await db.orm.public.RegulatoryRule.first({ id: inspection.ruleVersionId })
      : null;

    const [type, business] = await Promise.all([
      db.orm.public.InstrumentType.first({ id: instrument.instrumentTypeId }),
      db.orm.public.Business.first({ id: instrument.businessId }),
    ]);

    const verifiedAt = inspection.finalizedAt
      ? new Date(inspection.finalizedAt).toISOString()
      : new Date().toISOString();
    const validUntil = addMonths(verifiedAt, rule?.verificationPeriodMonths ?? 12);
    const issuingAuthority = await issuingAuthorityFor(instrument.administrativeUnitId);

    const created = await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      const certificateCode = await nextCertificateCode(orm);

      const canonical = {
        certificateCode,
        applicationCode: application.applicationCode,
        instrumentCode: instrument.instrumentCode,
        manufacturer: instrument.manufacturer,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        instrumentTypeName: type?.name ?? "",
        capacity: instrument.capacity,
        accuracyClass: instrument.accuracyClass,
        businessName: business?.businessName ?? "",
        result: "PASS" as const,
        ruleReference: rule?.id ?? "",
        verifiedAt,
        validUntil,
        issuingAuthority,
      };

      for (const prior of await orm.Certificate.where({ instrumentId: instrument.id })
        .where((c) => c.status.in([...ACTIVE_STATUSES]))
        .all()) {
        await orm.Certificate.where({ id: prior.id }).update({ status: "SUPERSEDED" });
        await orm.CertificateStatusHistory.create({
          certificateId: prior.id,
          fromStatus: prior.status,
          toStatus: "SUPERSEDED",
          changedById: user.id,
          reason: `Superseded by ${certificateCode}`,
        });
      }

      const certificate = await orm.Certificate.create({
        certificateCode,
        applicationId: application.id,
        instrumentId: instrument.id,
        ruleVersionId: rule?.id ?? null,
        payloadHash: hashPayload(buildCanonicalPayload(canonical)),
        verifiedAt,
        validUntil,
        status: "ACTIVE",
        fileId: null,
      });

      await orm.CertificateStatusHistory.create({
        certificateId: certificate.id,
        fromStatus: null,
        toStatus: "ACTIVE",
        changedById: user.id,
        reason: "Certificate issued after passing verification",
      });

      await orm.Application.where({ id: application.id }).update({ status: "CERTIFICATE_GENERATED" });
      await orm.ApplicationStatusHistory.create({
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: "CERTIFICATE_GENERATED",
        changedById: user.id,
        reason: null,
      });

      if (instrument.status !== "VERIFIED") {
        await orm.Instrument.where({ id: instrument.id }).update({ status: "VERIFIED" });
      }

      if (business) {
        await orm.Notification.create({
          userId: business.userId,
          certificateId: certificate.id,
          channel: "IN_APP",
          event: "CERTIFICATE_ISSUED",
          payload: {
            title: "Verification certificate issued",
            message: `Certificate ${certificateCode} has been issued for ${instrument.instrumentCode}.`,
            certificateCode,
            instrumentCode: instrument.instrumentCode,
          },
          status: "SENT",
          sentAt: new Date().toISOString(),
        });
      }

      return certificate;
    });

    const [output] = await toOutputs([created]);
    return output;
  },

  async updateStatus(input: UpdateCertificateStatusInput, user: AppUser): Promise<CertificateOutput> {
    const row = await db.orm.public.Certificate.first({ id: input.id });
    if (!row) notFound("Certificate", input.id);

    const instrument = await db.orm.public.Instrument.first({ id: row.instrumentId });
    if (!instrument) notFound("Instrument", row.instrumentId);
    await assertCanUpdateStatus(user, instrument);

    if (!ACTIVE_STATUSES.includes(row.status)) {
      invalidState(row.status, "Only active certificates can be suspended, cancelled, revoked, or superseded");
    }

    await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      await orm.Certificate.where({ id: row.id }).update({ status: input.status });
      await orm.CertificateStatusHistory.create({
        certificateId: row.id,
        fromStatus: row.status,
        toStatus: input.status,
        changedById: user.id,
        reason: input.reason,
      });
    });

    const [output] = await toOutputs([row]);
    return { ...output, status: input.status };
  },
};
