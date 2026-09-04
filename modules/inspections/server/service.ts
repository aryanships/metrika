import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { requireStateScope } from "@/middleware/require-state-scope";
import { assertTransition } from "@/modules/applications/server/state-machine";
import type { AppUser } from "@/middleware/context";
import type { UserRole } from "@/modules/auth/schema";
import type { AttachmentKind } from "@/modules/files/schema";
import { computeMeasurement, computeResult } from "./rules-engine";
import {
  GetInspectionInput,
  InspectionOutput,
  ObservationInput,
  ResponseInput,
  SaveDraftInspectionInput,
  StartInspectionInput,
  SubmitInspectionInput,
} from "../schema";

type Orm = typeof db.orm.public;
type InspectionRow = NonNullable<Awaited<ReturnType<Orm["Inspection"]["first"]>>>;
type ApplicationRow = NonNullable<Awaited<ReturnType<Orm["Application"]["first"]>>>;
type InstrumentRow = NonNullable<Awaited<ReturnType<Orm["Instrument"]["first"]>>>;

const ADMIN_ROLES: readonly UserRole[] = ["SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "DEPARTMENT_OFFICIAL"];
const SCOPED_ADMIN_ROLES: readonly UserRole[] = ["STATE_ADMIN", "DISTRICT_ADMIN"];
const REQUIRED_EVIDENCE: readonly AttachmentKind[] = [
  "INSTRUMENT_FRONT",
  "SERIAL_NUMBER",
  "NAMEPLATE",
  "VERIFICATION_AREA",
  "TEST_SETUP",
];

function notFound(resourceType: string, resourceId: string): never {
  throw new ORPCError("NOT_FOUND", { data: { resourceType, resourceId } });
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

function invalidState(current: string, reason: string): never {
  throw new ORPCError("INVALID_STATE", { data: { currentState: current, reason } });
}

interface InspectionContext {
  inspection: InspectionRow;
  application: ApplicationRow;
  instrument: InstrumentRow;
  workOrder: Awaited<ReturnType<Orm["WorkOrder"]["first"]>>;
}

async function loadContext(applicationId: string): Promise<InspectionContext> {
  const application = await db.orm.public.Application.first({ id: applicationId });
  if (!application) notFound("Application", applicationId);
  const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
  if (!instrument) notFound("Instrument", application.instrumentId);
  const inspection = await db.orm.public.Inspection.where({ applicationId }).first();
  if (!inspection) notFound("Inspection", applicationId);
  const workOrder = await db.orm.public.WorkOrder.where({ applicationId }).first();
  return { inspection, application, instrument, workOrder };
}

/** Resolve the actor as the assigned LMO or a member of the assigned GATC. */
async function resolveFieldAuthority(user: AppUser, workOrder: InspectionContext["workOrder"]) {
  if (!workOrder) return null;
  const lmo = user.roles.includes("LMO")
    ? await db.orm.public.Lmo.where({ userId: user.id, isActive: true }).first()
    : null;
  if (lmo && workOrder.lmoId === lmo.id) return { route: "LMO" as const, lmoId: lmo.id, gatcId: null };
  if (workOrder.gatcId) {
    const membership = await db.orm.public.GatcMembership.where({
      userId: user.id,
      gatcId: workOrder.gatcId,
      isActive: true,
    }).first();
    if (membership) return { route: "GATC" as const, lmoId: null, gatcId: workOrder.gatcId };
  }
  return null;
}

async function assertFieldAccess(user: AppUser, ctx: InspectionContext) {
  const authority = await resolveFieldAuthority(user, ctx.workOrder);
  if (!authority) forbidden("You are not assigned to this work order");
  return authority;
}

async function assertCanView(user: AppUser, ctx: InspectionContext): Promise<void> {
  if (user.roles.includes("INSTRUMENT_OWNER")) {
    if (user.businessId !== ctx.instrument.businessId) forbidden("Inspection does not belong to your business");
    return;
  }
  if (ADMIN_ROLES.some((r) => user.roles.includes(r))) {
    if (SCOPED_ADMIN_ROLES.some((r) => user.roles.includes(r))) {
      await requireStateScope(user, ctx.instrument.administrativeUnitId);
    }
    return;
  }
  await assertFieldAccess(user, ctx);
}

async function effectiveTemplate(instrumentTypeId: string) {
  const now = Date.now();
  const templates = await db.orm.public.InspectionTemplate.where({ instrumentTypeId, isActive: true }).all();
  return templates
    .filter((t) => Date.parse(t.effectiveFrom) <= now && (!t.effectiveUntil || Date.parse(t.effectiveUntil) >= now))
    .sort((a, b) => b.version - a.version)[0] ?? null;
}

async function effectiveRule(instrument: InstrumentRow) {
  const now = Date.now();
  const rules = await db.orm.public.RegulatoryRule.where({
    instrumentTypeId: instrument.instrumentTypeId,
    accuracyClass: instrument.accuracyClass ?? "",
  }).all();
  const capacity = Number(instrument.capacity);
  const matching = rules.filter(
    (r) =>
      Date.parse(r.effectiveFrom) <= now &&
      (!r.effectiveUntil || Date.parse(r.effectiveUntil) >= now) &&
      Number(r.capacityMin) <= capacity &&
      Number(r.capacityMax) >= capacity,
  );
  if (matching.length === 0) {
    validation("rule", "No regulatory rule covers this instrument type, accuracy class, and capacity");
  }
  if (matching.length > 1) {
    conflict("rule", "Multiple regulatory rules apply to this instrument");
  }
  return matching[0]!;
}

function validateResponseValue(kind: string, value: boolean | number | string): void {
  const valid =
    (kind === "CHECKLIST" && typeof value === "boolean") ||
    ((kind === "NUMERIC" || kind === "MEASUREMENT") && typeof value === "number") ||
    ((kind === "TEXT" || kind === "SELECT") && typeof value === "string");
  if (!valid) validation("responses", `Invalid value for ${kind} item`);
}

async function buildOutput(ctx: InspectionContext): Promise<InspectionOutput> {
  const { inspection, application, instrument, workOrder } = ctx;

  const [template, rule, measurements, responses, observations, attachments, type] = await Promise.all([
    inspection.templateId ? db.orm.public.InspectionTemplate.first({ id: inspection.templateId }) : Promise.resolve(null),
    inspection.ruleVersionId ? db.orm.public.RegulatoryRule.first({ id: inspection.ruleVersionId }) : Promise.resolve(null),
    db.orm.public.InspectionMeasurement.where({ inspectionId: inspection.id }).orderBy((m) => m.sequence.asc()).all(),
    db.orm.public.InspectionTemplateResponse.where({ inspectionId: inspection.id }).all(),
    db.orm.public.InspectionObservation.where({ inspectionId: inspection.id }).all(),
    db.orm.public.Attachment.where({ inspectionId: inspection.id }).all(),
    db.orm.public.InstrumentType.first({ id: instrument.instrumentTypeId }),
  ]);

  const templateItems = template
    ? await db.orm.public.InspectionTemplateItem.where({ templateId: template.id }).orderBy((i) => i.displayOrder.asc()).all()
    : [];
  const itemById = new Map(templateItems.map((i) => [i.id, i]));

  const presentKinds = new Set(attachments.map((a) => a.kind));

  return {
    id: inspection.id,
    applicationId: inspection.applicationId,
    route: inspection.lmoId ? "LMO" : "GATC",
    lmoId: inspection.lmoId,
    gatcId: inspection.gatcId,
    performedById: inspection.performedById,
    result: inspection.result,
    templateId: inspection.templateId,
    ruleVersionId: inspection.ruleVersionId,
    startedAt: inspection.startedAt,
    submittedAt: inspection.submittedAt,
    finalizedAt: inspection.finalizedAt,
    notes: inspection.notes,
    instrument: {
      id: instrument.id,
      instrumentCode: instrument.instrumentCode,
      instrumentTypeName: type?.name ?? "",
      unit: type?.unit ?? "",
      manufacturer: instrument.manufacturer,
      model: instrument.model,
      serialNumber: instrument.serialNumber,
      capacity: instrument.capacity,
      accuracyClass: instrument.accuracyClass,
      address: instrument.address,
    },
    application: {
      code: application.applicationCode,
      type: application.type,
      status: application.status,
    },
    appointment: {
      scheduledStartAt: workOrder?.scheduledStartAt ?? null,
      scheduledEndAt: workOrder?.scheduledEndAt ?? null,
      location: workOrder?.location ?? null,
    },
    template: template
      ? {
          id: template.id,
          code: template.code,
          name: template.name,
          version: template.version,
          items: templateItems.map((i) => ({
            id: i.id,
            code: i.code,
            label: i.label,
            kind: i.kind,
            unit: i.unit,
            isRequired: i.isRequired,
            displayOrder: i.displayOrder,
          })),
        }
      : null,
    rule: rule
      ? {
          id: rule.id,
          accuracyClass: rule.accuracyClass,
          permissibleError: rule.permissibleError,
          verificationPeriodMonths: rule.verificationPeriodMonths,
        }
      : null,
    measurements: measurements.map((m) => ({
      sequence: m.sequence,
      code: m.code,
      label: m.label,
      unit: m.unit,
      standardValue: m.standardValue,
      observedValue: m.observedValue,
      permissibleError: m.permissibleError,
      observedError: m.observedError,
      withinLimit: m.withinLimit,
    })),
    responses: responses.map((r) => {
      const item = itemById.get(r.templateItemId);
      return {
        id: r.id,
        templateItemId: r.templateItemId,
        code: item?.code ?? "",
        label: item?.label ?? "",
        kind: item?.kind ?? "",
        value: r.value,
        isCompliant: r.isCompliant,
        remarks: r.remarks,
        createdAt: r.createdAt,
      };
    }),
    observations: observations.map((o) => ({
      id: o.id,
      code: o.code,
      label: o.label,
      severity: o.severity,
      isCompliant: o.isCompliant,
      remarks: o.remarks,
      createdAt: o.createdAt,
    })),
    evidence: {
      required: [...REQUIRED_EVIDENCE],
      present: [...presentKinds],
      complete: REQUIRED_EVIDENCE.every((k) => presentKinds.has(k)),
    },
  };
}

export const inspectionsService = {
  async start(input: StartInspectionInput, user: AppUser): Promise<InspectionOutput> {
    const application = await db.orm.public.Application.first({ id: input.applicationId });
    if (!application) notFound("Application", input.applicationId);
    const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
    if (!instrument) notFound("Instrument", application.instrumentId);
    const workOrder = await db.orm.public.WorkOrder.where({ applicationId: application.id }).first();

    const authority = await resolveFieldAuthority(user, workOrder);
    if (!authority) forbidden("You are not assigned to this work order");

    const existing = await db.orm.public.Inspection.where({ applicationId: application.id }).first();
    if (existing) conflict("applicationId", "An inspection already exists for this application");

    assertTransition(application.status, "VERIFICATION_IN_PROGRESS", "FIELD");

    const template = await effectiveTemplate(instrument.instrumentTypeId);
    if (!template) validation("template", "No active inspection template for this instrument type");
    const rule = await effectiveRule(instrument);

    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      await orm.Inspection.create({
        applicationId: application.id,
        lmoId: authority.lmoId,
        gatcId: authority.gatcId,
        performedById: user.id,
        startedAt: now,
        submittedAt: null,
        finalizedAt: null,
        finalizedById: null,
        result: null,
        ruleVersionId: rule.id,
        templateId: template.id,
        notes: null,
      });
      await orm.Application.where({ id: application.id }).update({ status: "VERIFICATION_IN_PROGRESS" });
      await orm.ApplicationStatusHistory.create({
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: "VERIFICATION_IN_PROGRESS",
        changedById: user.id,
        reason: null,
      });
    });

    return buildOutput(await loadContext(input.applicationId));
  },

  async get(input: GetInspectionInput, user: AppUser): Promise<InspectionOutput> {
    const ctx = await loadContext(input.applicationId);
    await assertCanView(user, ctx);
    return buildOutput(ctx);
  },

  async saveDraft(input: SaveDraftInspectionInput, user: AppUser): Promise<InspectionOutput> {
    const ctx = await loadContext(input.applicationId);
    await assertFieldAccess(user, ctx);
    if (ctx.inspection.finalizedAt) invalidState("FINALIZED", "Inspection is finalized and cannot be edited");

    const rule = ctx.inspection.ruleVersionId
      ? await db.orm.public.RegulatoryRule.first({ id: ctx.inspection.ruleVersionId })
      : null;

    const applyResponses = async (orm: Orm, responses: ResponseInput[]) => {
      await orm.InspectionTemplateResponse.where({ inspectionId: ctx.inspection.id }).delete();
      for (const r of responses) {
        const item = ctx.inspection.templateId
          ? await orm.InspectionTemplateItem.first({ id: r.templateItemId })
          : null;
        if (!item || item.templateId !== ctx.inspection.templateId) {
          validation("responses", `Unknown template item ${r.templateItemId}`);
        }
        validateResponseValue(item.kind, r.value);
        await orm.InspectionTemplateResponse.create({
          inspectionId: ctx.inspection.id,
          templateItemId: r.templateItemId,
          value: r.value as never,
          isCompliant: r.isCompliant ?? null,
          remarks: r.remarks ?? null,
        });
      }
    };

    const applyObservations = async (orm: Orm, observations: ObservationInput[]) => {
      await orm.InspectionObservation.where({ inspectionId: ctx.inspection.id }).delete();
      for (const o of observations) {
        await orm.InspectionObservation.create({
          inspectionId: ctx.inspection.id,
          code: o.code ?? null,
          label: o.label,
          severity: o.severity,
          isCompliant: o.isCompliant ?? null,
          remarks: o.remarks,
        });
      }
    };

    await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      if (input.notes !== undefined) {
        await orm.Inspection.where({ id: ctx.inspection.id }).update({ notes: input.notes ?? null });
      }
      if (input.measurements !== undefined) {
        if (!rule) validation("rule", "Cannot record measurements without an applicable rule");
        await orm.InspectionMeasurement.where({ inspectionId: ctx.inspection.id }).delete();
        for (const m of input.measurements) {
          const { observedError, withinLimit } = computeMeasurement(
            m.standardValue,
            m.observedValue,
            rule.permissibleError,
          );
          await orm.InspectionMeasurement.create({
            inspectionId: ctx.inspection.id,
            sequence: m.sequence,
            code: m.code,
            label: m.label,
            unit: m.unit ?? null,
            standardValue: m.standardValue,
            observedValue: m.observedValue,
            permissibleError: rule.permissibleError,
            observedError,
            withinLimit,
          });
        }
      }
      if (input.responses !== undefined) await applyResponses(orm, input.responses);
      if (input.observations !== undefined) await applyObservations(orm, input.observations);
    });

    return buildOutput(await loadContext(input.applicationId));
  },

  async submit(input: SubmitInspectionInput, user: AppUser): Promise<InspectionOutput> {
    const ctx = await loadContext(input.applicationId);
    await assertFieldAccess(user, ctx);
    if (ctx.inspection.finalizedAt) invalidState("FINALIZED", "Inspection already finalized");

    const measurements = await db.orm.public.InspectionMeasurement.where({ inspectionId: ctx.inspection.id }).all();
    if (measurements.length === 0) validation("measurements", "Record at least one measurement before submitting");

    const attachments = await db.orm.public.Attachment.where({ inspectionId: ctx.inspection.id }).all();
    const presentKinds = new Set(attachments.map((a) => a.kind));
    const missing = REQUIRED_EVIDENCE.filter((k) => !presentKinds.has(k));
    if (missing.length > 0) {
      throw new ORPCError("VALIDATION_ERROR", {
        data: { issues: missing.map((k) => ({ path: "evidence", message: `Missing required evidence: ${k}` })) },
      });
    }

    const result = computeResult(measurements);
    const toStatus = result === "PASS" ? "PASSED" : "FAILED";
    assertTransition(ctx.application.status, toStatus, "FIELD");

    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      await orm.Inspection.where({ id: ctx.inspection.id }).update({
        result,
        submittedAt: now,
        finalizedAt: now,
        finalizedById: user.id,
      });
      await orm.Application.where({ id: ctx.application.id }).update({ status: toStatus });
      await orm.ApplicationStatusHistory.create({
        applicationId: ctx.application.id,
        fromStatus: ctx.application.status,
        toStatus,
        changedById: user.id,
        reason: null,
      });
      if (result === "PASS") {
        await orm.Instrument.where({ id: ctx.instrument.id }).update({ status: "VERIFIED" });
      }
    });

    return buildOutput(await loadContext(input.applicationId));
  },
};
