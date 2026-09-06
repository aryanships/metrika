import { db } from "@/prisma/db";
import { descendantUnitIds } from "@/lib/geo";
import type { AppUser } from "@/middleware/context";

const UNRESTRICTED_ROLES = ["SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"] as const;
const SCOPED_ADMIN_ROLES = ["STATE_ADMIN", "DISTRICT_ADMIN"] as const;

function isUnrestricted(user: AppUser): boolean {
  return UNRESTRICTED_ROLES.some((r) => user.roles.includes(r));
}

function isScopedAdmin(user: AppUser): boolean {
  return SCOPED_ADMIN_ROLES.some((r) => user.roles.includes(r));
}

/** Instrument IDs visible to a scoped admin, or null when unrestricted. */
export async function adminInstrumentIds(user: AppUser): Promise<Set<string> | null> {
  if (isUnrestricted(user)) return null;
  const scopes = await db.orm.public.AdminScope.where({ userId: user.id }).all();
  if (scopes.length === 0) return new Set();
  const unitIds = await descendantUnitIds(scopes.map((s) => s.administrativeUnitId));
  const instruments = await db.orm.public.Instrument.where((i) => i.administrativeUnitId.in([...unitIds])).select("id").all();
  return new Set(instruments.map((i) => i.id));
}

/** Application IDs whose inspection the field user performed or is authorized for. */
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

/** Instrument IDs visible to any authenticated user, or null when unrestricted. */
export async function visibleInstrumentIds(user: AppUser): Promise<Set<string> | null> {
  if (isUnrestricted(user) || isScopedAdmin(user)) return adminInstrumentIds(user);
  if (user.roles.includes("INSTRUMENT_OWNER")) {
    if (!user.businessId) return new Set();
    const instruments = await db.orm.public.Instrument.where({ businessId: user.businessId }).select("id").all();
    return new Set(instruments.map((i) => i.id));
  }
  const appIds = await fieldApplicationIds(user);
  if (appIds.size === 0) return new Set();
  const apps = await db.orm.public.Application.where((a) => a.id.in([...appIds])).select("instrumentId").all();
  return new Set(apps.map((a) => a.instrumentId));
}

/** Business IDs visible to a user, or null when unrestricted. */
export async function visibleBusinessIds(user: AppUser): Promise<Set<string> | null> {
  if (isUnrestricted(user) || isScopedAdmin(user)) return null;
  if (user.roles.includes("INSTRUMENT_OWNER")) {
    return user.businessId ? new Set([user.businessId]) : new Set();
  }
  return new Set();
}
