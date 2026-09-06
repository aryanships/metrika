import { db } from "@/prisma/db";
import { ancestorUnitIds } from "@/lib/geo";

type Orm = typeof db.orm.public;
export interface NotificationDraft {
  event: string;
  title: string;
  message: string;
  extra?: Record<string, unknown>;
}

function payloadOf(draft: NotificationDraft): Record<string, unknown> {
  return { title: draft.title, message: draft.message, ...(draft.extra ?? {}) };
}

export async function notifyUser(orm: Orm, userId: string, draft: NotificationDraft): Promise<void> {
  await orm.Notification.create({
    userId,
    channel: "IN_APP",
    event: draft.event,
    payload: payloadOf(draft) as never,
    status: "SENT",
    sentAt: new Date().toISOString(),
  });
}

/** Notify STATE/DISTRICT admins whose scope covers the given administrative unit. */
export async function notifyAdminsForUnit(orm: Orm, administrativeUnitId: string, draft: NotificationDraft): Promise<void> {
  const ancestorIds = [...(await ancestorUnitIds(administrativeUnitId))];
  if (ancestorIds.length === 0) return;
  const scopes = await orm.AdminScope.where((s) => s.administrativeUnitId.in(ancestorIds)).all();
  const userIds = [...new Set(scopes.map((s) => s.userId))];
  for (const userId of userIds) await notifyUser(orm, userId, draft);
}

export async function notifyBusinessOwner(orm: Orm, businessId: string, draft: NotificationDraft): Promise<void> {
  const business = await orm.Business.first({ id: businessId });
  if (business) await notifyUser(orm, business.userId, draft);
}

/** Notify the assigned LMO officer, or every active GATC member, for a work order. */
export async function notifyWorkOrderAssignees(
  orm: Orm,
  workOrder: { lmoId: string | null; gatcId: string | null },
  draft: NotificationDraft,
): Promise<void> {
  if (workOrder.lmoId) {
    const lmo = await orm.Lmo.first({ id: workOrder.lmoId });
    if (lmo) await notifyUser(orm, lmo.userId, draft);
    return;
  }
  if (workOrder.gatcId) {
    const memberships = await orm.GatcMembership.where({ gatcId: workOrder.gatcId, isActive: true }).all();
    for (const m of memberships) await notifyUser(orm, m.userId, draft);
  }
}
