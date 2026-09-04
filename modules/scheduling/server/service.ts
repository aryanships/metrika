import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { paginationMeta } from "@/schemas/shared";
import { requireStateScope } from "@/middleware/require-state-scope";
import { ancestorUnitIds, descendantUnitIds } from "@/lib/geo";
import { assertTransition } from "@/modules/applications/server/state-machine";
import type { AppUser } from "@/middleware/context";
import type { UserRole } from "@/modules/auth/schema";
import {
  AssignWorkOrderInput,
  CandidateScore,
  ListWorkOrdersInput,
  ListWorkOrdersOutput,
  RecommendCandidatesInput,
  RecommendCandidatesOutput,
  RouteType,
  ScheduleAppointmentInput,
  WorkOrderOutput,
} from "../schema";

type Orm = typeof db.orm.public;
type ApplicationRow = NonNullable<Awaited<ReturnType<Orm["Application"]["first"]>>>;
type InstrumentRow = NonNullable<Awaited<ReturnType<Orm["Instrument"]["first"]>>>;
type WorkOrderRow = NonNullable<Awaited<ReturnType<Orm["WorkOrder"]["first"]>>>;

const ADMIN_ROLES: readonly UserRole[] = ["SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "DEPARTMENT_OFFICIAL"];
const UNRESTRICTED_ROLES: readonly UserRole[] = ["SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"];
const OPEN_WORK_STATUSES: readonly string[] = ["APPROVED", "SCHEDULED", "VERIFICATION_IN_PROGRESS"];

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

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function toWorkOrderOutput(row: WorkOrderRow): WorkOrderOutput {
  return {
    id: row.id,
    applicationId: row.applicationId,
    route: row.route,
    lmoId: row.lmoId,
    gatcId: row.gatcId,
    recommendedScore: row.recommendedScore,
    wasOverridden: row.wasOverridden,
    assignedById: row.assignedById,
    assignedAt: row.assignedAt,
    scheduledStartAt: row.scheduledStartAt,
    scheduledEndAt: row.scheduledEndAt,
    location: row.location,
  };
}

async function loadApplication(applicationId: string): Promise<{ application: ApplicationRow; instrument: InstrumentRow }> {
  const application = await db.orm.public.Application.first({ id: applicationId });
  if (!application) notFound("Application", applicationId);
  const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
  if (!instrument) notFound("Instrument", application.instrumentId);
  return { application, instrument };
}

async function assertScopedAdmin(user: AppUser, instrumentUnitId: string): Promise<void> {
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return;
  await requireStateScope(user, instrumentUnitId);
}

interface BaseCandidate {
  id: string;
  type: RouteType;
  name: string;
  detail: string;
  latitude: string | null;
  longitude: string | null;
}

async function eligibleLmos(orm: Orm, instrumentTypeId: string, ancestry: Set<string>): Promise<BaseCandidate[]> {
  const lmos = await orm.Lmo.where({ isActive: true }).all();
  const userIds = lmos.map((l) => l.userId);
  const users = userIds.length ? await orm.User.where((u) => u.id.in(userIds)).all() : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const candidates: BaseCandidate[] = [];
  for (const lmo of lmos) {
    const user = userById.get(lmo.userId);
    if (!user || !user.isActive) continue;
    const [expertise, jurisdictions] = await Promise.all([
      orm.LmoInstrumentType.where({ lmoId: lmo.id }).all(),
      orm.LmoJurisdiction.where({ lmoId: lmo.id }).all(),
    ]);
    const matchesType = expertise.some((e) => e.instrumentTypeId === instrumentTypeId);
    const coversArea = jurisdictions.some((j) => ancestry.has(j.administrativeUnitId));
    if (!matchesType || !coversArea) continue;
    candidates.push({
      id: lmo.id,
      type: "LMO",
      name: user.fullName,
      detail: lmo.employeeId,
      latitude: lmo.baseLatitude,
      longitude: lmo.baseLongitude,
    });
  }
  return candidates;
}

async function eligibleGatcs(orm: Orm, instrumentTypeId: string, ancestry: Set<string>, now: number): Promise<BaseCandidate[]> {
  const gatcs = await orm.Gatc.where({ isActive: true }).all();
  const candidates: BaseCandidate[] = [];
  for (const gatc of gatcs) {
    if (Date.parse(gatc.approvalValidFrom) > now || Date.parse(gatc.approvalValidUntil) < now) continue;
    const [authorizations, serviceAreas] = await Promise.all([
      orm.GatcAuthorization.where({ gatcId: gatc.id }).all(),
      orm.GatcServiceArea.where({ gatcId: gatc.id }).all(),
    ]);
    const authorized = authorizations.some(
      (a) => a.instrumentTypeId === instrumentTypeId && Date.parse(a.validFrom) <= now && Date.parse(a.validUntil) >= now,
    );
    const coversArea = serviceAreas.some((s) => ancestry.has(s.administrativeUnitId));
    if (!authorized || !coversArea) continue;
    candidates.push({
      id: gatc.id,
      type: "GATC",
      name: gatc.legalName,
      detail: gatc.approvalNumber,
      latitude: gatc.latitude,
      longitude: gatc.longitude,
    });
  }
  return candidates;
}

// ponytail: per-candidate queries are fine at demo scale (a handful of officers).
async function loadSchedule(orm: Orm, route: RouteType, assigneeId: string) {
  const orders =
    route === "LMO"
      ? await orm.WorkOrder.where({ lmoId: assigneeId }).all()
      : await orm.WorkOrder.where({ gatcId: assigneeId }).all();

  const appIds = orders.map((o) => o.applicationId);
  const apps = appIds.length ? await orm.Application.where((a) => a.id.in(appIds)).select("id", "status").all() : [];
  const statusById = new Map(apps.map((a) => [a.id, a.status]));

  const open = orders.filter((o) => OPEN_WORK_STATUSES.includes(statusById.get(o.applicationId) ?? "")).length;
  return {
    open,
    windows: orders.map((o) => ({ start: o.scheduledStartAt, end: o.scheduledEndAt })),
  };
}

function scoreCandidate(
  candidate: BaseCandidate,
  instrument: InstrumentRow,
  application: ApplicationRow,
  schedule: { open: number; windows: { start: string | null; end: string | null }[] },
): CandidateScore {
  const distanceKm = distanceBetween(instrument.latitude, instrument.longitude, candidate.latitude, candidate.longitude);
  const distance = distanceKm === null ? 50 : clamp(100 - distanceKm * 5, 0, 100);
  const workload = clamp(100 - schedule.open * 10, 0, 100);

  const start = application.preferredStartAt;
  const end = application.preferredEndAt;
  const hasConflict =
    !!start &&
    !!end &&
    schedule.windows.some(
      (w) => w.start && w.end && Date.parse(w.start) <= Date.parse(end) && Date.parse(w.end) >= Date.parse(start),
    );
  const availability = hasConflict ? 0 : 100;

  const total = Math.round((0.5 * distance + 0.3 * workload + 0.2 * availability) * 10) / 10;

  return {
    candidateId: candidate.id,
    candidateType: candidate.type,
    name: candidate.name,
    detail: candidate.detail,
    totalScore: total,
    breakdown: { distanceScore: distance, workloadScore: workload, availabilityScore: availability },
    currentWorkload: schedule.open,
    estimatedDistanceKm: distanceKm,
  };
}

function distanceBetween(
  aLat: string | null,
  aLng: string | null,
  bLat: string | null,
  bLng: string | null,
): number | null {
  if (!aLat || !aLng || !bLat || !bLng) return null;
  return haversineKm(Number(aLat), Number(aLng), Number(bLat), Number(bLng));
}

async function buildRecommendation(application: ApplicationRow, instrument: InstrumentRow): Promise<RecommendCandidatesOutput> {
  const orm = db.orm.public;
  const now = Date.now();
  const ancestry = await ancestorUnitIds(instrument.administrativeUnitId);

  const [lmos, gatcs] = await Promise.all([
    eligibleLmos(orm, instrument.instrumentTypeId, ancestry),
    eligibleGatcs(orm, instrument.instrumentTypeId, ancestry, now),
  ]);

  const candidates: CandidateScore[] = [];
  for (const candidate of [...lmos, ...gatcs]) {
    const schedule = await loadSchedule(orm, candidate.type, candidate.id);
    candidates.push(scoreCandidate(candidate, instrument, application, schedule));
  }
  candidates.sort(
    (a, b) => b.totalScore - a.totalScore || a.currentWorkload - b.currentWorkload || a.name.localeCompare(b.name),
  );

  return {
    applicationId: application.id,
    recommendedRoute: gatcs.length > 0 ? "GATC" : "LMO",
    candidates,
  };
}

export const schedulingService = {
  async recommend(input: RecommendCandidatesInput, user: AppUser): Promise<RecommendCandidatesOutput> {
    const { application, instrument } = await loadApplication(input.applicationId);
    await assertScopedAdmin(user, instrument.administrativeUnitId);
    if (!["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(application.status)) {
      invalidState(application.status, "Recommendations are only available for submitted applications");
    }
    return buildRecommendation(application, instrument);
  },

  async assign(input: AssignWorkOrderInput, user: AppUser): Promise<WorkOrderOutput> {
    const { application, instrument } = await loadApplication(input.applicationId);
    await assertScopedAdmin(user, instrument.administrativeUnitId);
    if (application.status !== "APPROVED") {
      invalidState(application.status, "Only approved applications can be assigned");
    }

    const existing = await db.orm.public.WorkOrder.where({ applicationId: application.id }).first();
    if (existing) conflict("applicationId", "Application already has an assigned work order");

    const recommendation = await buildRecommendation(application, instrument);
    const chosen = recommendation.candidates.find(
      (c) => c.candidateId === input.assigneeId && c.candidateType === input.route,
    );
    if (!chosen) {
      forbidden("Selected assignee is not eligible for this application (route, scope, or authorization)");
    }

    const top = recommendation.candidates[0];
    const wasOverridden = !top || top.candidateId !== chosen.candidateId || top.candidateType !== chosen.candidateType;

    const created = await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      const workOrder = await orm.WorkOrder.create({
        applicationId: application.id,
        route: input.route,
        lmoId: input.route === "LMO" ? input.assigneeId : null,
        gatcId: input.route === "GATC" ? input.assigneeId : null,
        recommendedScore: String(chosen.totalScore),
        wasOverridden,
        assignedById: user.id,
        assignedAt: new Date().toISOString(),
        scheduledStartAt: null,
        scheduledEndAt: null,
        location: null,
      });
      await orm.Application.where({ id: application.id }).update({ route: input.route });
      return workOrder;
    });

    return toWorkOrderOutput(created);
  },

  async schedule(input: ScheduleAppointmentInput, user: AppUser): Promise<WorkOrderOutput> {
    const { application, instrument } = await loadApplication(input.applicationId);
    await assertScopedAdmin(user, instrument.administrativeUnitId);
    assertTransition(application.status, "SCHEDULED", "ADMIN");

    const workOrder = await db.orm.public.WorkOrder.where({ applicationId: application.id }).first();
    if (!workOrder) invalidState(application.status, "Assign a work order before scheduling");

    const startMs = Date.parse(input.scheduledStartAt);
    const endMs = Date.parse(input.scheduledEndAt);
    if (startMs >= endMs) {
      throw new ORPCError("VALIDATION_ERROR", {
        data: { issues: [{ path: "scheduledEndAt", message: "Appointment end must be after start" }] },
      });
    }

    // Conflict check against the same assignee's other scheduled work.
    const others =
      workOrder.lmoId !== null
        ? await db.orm.public.WorkOrder.where({ lmoId: workOrder.lmoId }).all()
        : await db.orm.public.WorkOrder.where({ gatcId: workOrder.gatcId! }).all();
    const clash = others.some(
      (o) =>
        o.id !== workOrder.id &&
        o.scheduledStartAt &&
        o.scheduledEndAt &&
        Date.parse(o.scheduledStartAt) <= endMs &&
        Date.parse(o.scheduledEndAt) >= startMs,
    );
    if (clash) conflict("scheduledStartAt", "Assignee already has a scheduled appointment in this window");

    await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      await orm.WorkOrder.where({ id: workOrder.id }).update({
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        location: input.location ?? null,
      });
      await orm.Application.where({ id: application.id }).update({ status: "SCHEDULED" });
      await orm.ApplicationStatusHistory.create({
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: "SCHEDULED",
        changedById: user.id,
        reason: null,
      });
    });

    const updated = await db.orm.public.WorkOrder.first({ id: workOrder.id });
    return toWorkOrderOutput(updated!);
  },

  async listWorkOrders(input: ListWorkOrdersInput, user: AppUser): Promise<ListWorkOrdersOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    let query = db.orm.public.WorkOrder;

    if (user.roles.includes("LMO")) {
      const lmo = await db.orm.public.Lmo.first({ userId: user.id });
      if (!lmo) return { items: [], pagination: paginationMeta(0, page, limit) };
      query = query.where({ lmoId: lmo.id });
    } else if (ADMIN_ROLES.some((r) => user.roles.includes(r))) {
      const appIds = await adminScopedApplicationIds(user);
      if (appIds !== null) {
        if (appIds.size === 0) return { items: [], pagination: paginationMeta(0, page, limit) };
        query = query.where((w) => w.applicationId.in([...appIds]));
      }
    } else {
      const memberships = await db.orm.public.GatcMembership.where({ userId: user.id, isActive: true }).all();
      if (memberships.length === 0) forbidden("Not authorized to view work orders");
      query = query.where((w) => w.gatcId.in(memberships.map((m) => m.gatcId)));
    }

    if (input.route) query = query.where({ route: input.route });

    const [rows, totals] = await Promise.all([
      query.orderBy((w) => w.assignedAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    return { items: rows.map(toWorkOrderOutput), pagination: paginationMeta(totals.total, page, limit) };
  },
};

async function adminScopedApplicationIds(user: AppUser): Promise<Set<string> | null> {
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return null;
  const scopes = await db.orm.public.AdminScope.where({ userId: user.id }).all();
  if (scopes.length === 0) return new Set();

  const unitIds = await descendantUnitIds(scopes.map((s) => s.administrativeUnitId));
  const instrumentIds = (
    await db.orm.public.Instrument.where((i) => i.administrativeUnitId.in([...unitIds])).select("id").all()
  ).map((i) => i.id);
  if (instrumentIds.length === 0) return new Set();

  const appIds = (
    await db.orm.public.Application.where((a) => a.instrumentId.in(instrumentIds)).select("id").all()
  ).map((a) => a.id);
  return new Set(appIds);
}
