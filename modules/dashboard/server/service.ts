import { db } from "@/prisma/db";
import { descendantUnitIds } from "@/lib/geo";
import type { AppUser } from "@/middleware/context";
import { DashboardStatsOutput } from "../schema";

type Orm = typeof db.orm.public;
type WorkOrderRow = NonNullable<Awaited<ReturnType<Orm["WorkOrder"]["first"]>>>;

const UNRESTRICTED_ROLES = ["SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"] as const;
const SCOPED_ADMIN_ROLES = ["STATE_ADMIN", "DISTRICT_ADMIN"] as const;
const OPEN_WORK_STATUSES = ["SCHEDULED", "VERIFICATION_IN_PROGRESS"] as const;

function countByStatus(items: { status: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[item.status] = (out[item.status] ?? 0) + 1;
  return out;
}

function isUnrestricted(user: AppUser): boolean {
  return UNRESTRICTED_ROLES.some((r) => user.roles.includes(r));
}

/** Instrument IDs visible to an admin, or null when unrestricted. */
async function adminInstrumentIds(user: AppUser): Promise<Set<string> | null> {
  if (isUnrestricted(user)) return null;
  const scopes = await db.orm.public.AdminScope.where({ userId: user.id }).all();
  if (scopes.length === 0) return new Set();
  const unitIds = await descendantUnitIds(scopes.map((s) => s.administrativeUnitId));
  const instruments = await db.orm.public.Instrument
    .where((i) => i.administrativeUnitId.in([...unitIds]))
    .select("id")
    .all();
  return new Set(instruments.map((i) => i.id));
}

async function ownerStats(user: AppUser) {
  if (!user.businessId) {
    return {
      instrumentsByStatus: {},
      certificatesByStatus: {},
      applicationsByStatus: {},
      upcomingAppointments: [],
    };
  }

  const instruments = await db.orm.public.Instrument.where({ businessId: user.businessId }).all();
  const instrumentIds = instruments.map((i) => i.id);
  const [certificates, applications] = await Promise.all([
    instrumentIds.length
      ? db.orm.public.Certificate.where((c) => c.instrumentId.in(instrumentIds)).all()
      : Promise.resolve([]),
    instrumentIds.length
      ? db.orm.public.Application.where((a) => a.instrumentId.in(instrumentIds)).all()
      : Promise.resolve([]),
  ]);

  const applicationIds = applications.map((a) => a.id);
  const workOrders = applicationIds.length
    ? await db.orm.public.WorkOrder.where((w) => w.applicationId.in(applicationIds)).all()
    : [];

  const instrumentById = new Map(instruments.map((i) => [i.id, i]));
  const applicationById = new Map(applications.map((a) => [a.id, a]));
  const upcomingAppointments = workOrders
    .filter((w) => w.scheduledStartAt)
    .map((w) => {
      const application = applicationById.get(w.applicationId);
      const instrument = application ? instrumentById.get(application.instrumentId) : undefined;
      return {
        applicationCode: application?.applicationCode ?? "",
        instrumentCode: instrument?.instrumentCode ?? "",
        scheduledStartAt: w.scheduledStartAt,
        scheduledEndAt: w.scheduledEndAt,
      };
    })
    .sort((a, b) => (a.scheduledStartAt! < b.scheduledStartAt! ? -1 : 1))
    .slice(0, 5);

  return {
    instrumentsByStatus: countByStatus(instruments),
    certificatesByStatus: countByStatus(certificates),
    applicationsByStatus: countByStatus(applications),
    upcomingAppointments,
  };
}

async function adminStats(user: AppUser) {
  const instrumentIds = await adminInstrumentIds(user);
  if (instrumentIds !== null && instrumentIds.size === 0) {
    return {
      applicationsByStatus: {},
      certificatesByStatus: {},
      applicationsByDistrict: [],
      lmoWorkload: [],
      gatcWorkload: [],
    };
  }

  let instrumentsQuery = db.orm.public.Instrument;
  if (instrumentIds !== null) instrumentsQuery = instrumentsQuery.where((i) => i.id.in([...instrumentIds]));
  const instruments = await instrumentsQuery.all();
  const ids = instruments.map((i) => i.id);

  const [applications, certificates] = await Promise.all([
    db.orm.public.Application.where((a) => a.instrumentId.in(ids)).all(),
    db.orm.public.Certificate.where((c) => c.instrumentId.in(ids)).all(),
  ]);

  // Group applications by their instrument's district ancestor.
  const units = await db.orm.public.AdministrativeUnit.select("id", "name", "type", "parentId").all();
  const unitById = new Map(units.map((u) => [u.id, u]));
  const instrumentById = new Map(instruments.map((i) => [i.id, i]));
  const districtCount: Record<string, number> = {};
  for (const application of applications) {
    const instrument = instrumentById.get(application.instrumentId);
    if (!instrument) continue;
    let unit = unitById.get(instrument.administrativeUnitId);
    while (unit && unit.type !== "DISTRICT") {
      unit = unit.parentId ? unitById.get(unit.parentId) : undefined;
    }
    const name = unit?.name ?? "Unknown";
    districtCount[name] = (districtCount[name] ?? 0) + 1;
  }

  // Open workload per LMO and GATC.
  const appIds = applications.map((a) => a.id);
  const workOrders = appIds.length
    ? await db.orm.public.WorkOrder.where((w) => w.applicationId.in(appIds)).all()
    : [];
  const statusById = new Map(applications.map((a) => [a.id, a.status]));
  const openWorkOrders = workOrders.filter((w) => OPEN_WORK_STATUSES.includes(statusById.get(w.applicationId) as never));

  const lmos = await db.orm.public.Lmo.where({ isActive: true }).all();
  const gatcs = await db.orm.public.Gatc.where({ isActive: true }).all();
  const lmoUserIds = lmos.map((l) => l.userId);
  const users = lmoUserIds.length ? await db.orm.public.User.where((u) => u.id.in(lmoUserIds)).all() : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const lmoWorkload = lmos.map((lmo) => ({
    name: userById.get(lmo.userId)?.fullName ?? lmo.employeeId,
    open: openWorkOrders.filter((w) => w.lmoId === lmo.id).length,
  }));
  const gatcWorkload = gatcs.map((gatc) => ({
    name: gatc.legalName,
    open: openWorkOrders.filter((w) => w.gatcId === gatc.id).length,
  }));

  return {
    applicationsByStatus: countByStatus(applications),
    certificatesByStatus: countByStatus(certificates),
    applicationsByDistrict: Object.entries(districtCount)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count),
    lmoWorkload,
    gatcWorkload,
  };
}

async function enrichWorkOrders(workOrders: WorkOrderRow[]) {
  if (workOrders.length === 0) return [];
  const applicationIds = workOrders.map((w) => w.applicationId);
  const applications = await db.orm.public.Application.where((a) => a.id.in(applicationIds)).all();
  const instrumentIds = [...new Set(applications.map((a) => a.instrumentId))];
  const [instruments, types] = await Promise.all([
    db.orm.public.Instrument.where((i) => i.id.in(instrumentIds)).all(),
    db.orm.public.InstrumentType.select("id", "name").all(),
  ]);
  const applicationById = new Map(applications.map((a) => [a.id, a]));
  const instrumentById = new Map(instruments.map((i) => [i.id, i]));
  const typeById = new Map(types.map((t) => [t.id, t.name]));

  return workOrders.map((w) => {
    const application = applicationById.get(w.applicationId);
    const instrument = application ? instrumentById.get(application.instrumentId) : undefined;
    return {
      applicationId: w.applicationId,
      applicationCode: application?.applicationCode ?? "",
      instrumentCode: instrument?.instrumentCode ?? "",
      instrumentType: instrument ? (typeById.get(instrument.instrumentTypeId) ?? "") : "",
      scheduledStartAt: w.scheduledStartAt,
      scheduledEndAt: w.scheduledEndAt,
      location: w.location,
      status: application?.status ?? "",
    };
  });
}

async function fieldStats(user: AppUser) {
  let workOrders: WorkOrderRow[] = [];

  const lmo = await db.orm.public.Lmo.where({ userId: user.id, isActive: true }).first();
  if (lmo) {
    workOrders = await db.orm.public.WorkOrder.where({ lmoId: lmo.id }).all();
  } else {
    const memberships = await db.orm.public.GatcMembership.where({ userId: user.id, isActive: true }).all();
    if (memberships.length > 0) {
      workOrders = await db.orm.public.WorkOrder
        .where((w) => w.gatcId.in(memberships.map((m) => m.gatcId)))
        .all();
    }
  }

  const enriched = await enrichWorkOrders(workOrders);
  const open = enriched.filter((w) => OPEN_WORK_STATUSES.includes(w.status as never));
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const today = open.filter(
    (w) => w.scheduledStartAt && Date.parse(w.scheduledStartAt) >= todayStart.getTime() && Date.parse(w.scheduledStartAt) <= todayEnd.getTime(),
  );

  return {
    assigned: open.length,
    today: today.length,
    pending: open.filter((w) => w.status === "SCHEDULED").length,
    workOrders: enriched,
  };
}

export const dashboardService = {
  async getStats(user: AppUser): Promise<DashboardStatsOutput> {
    if (user.roles.includes("INSTRUMENT_OWNER")) {
      return { role: "INSTRUMENT_OWNER", owner: await ownerStats(user), admin: null, field: null };
    }
    if (user.roles.includes("LMO")) {
      return { role: "LMO", owner: null, admin: null, field: await fieldStats(user) };
    }
    const membership = await db.orm.public.GatcMembership.where({ userId: user.id, isActive: true }).first();
    if (membership && !isUnrestricted(user) && !SCOPED_ADMIN_ROLES.some((r) => user.roles.includes(r))) {
      return { role: "GATC", owner: null, admin: null, field: await fieldStats(user) };
    }
    return { role: user.roles[0] ?? "ADMIN", owner: null, admin: await adminStats(user), field: null };
  },
};
