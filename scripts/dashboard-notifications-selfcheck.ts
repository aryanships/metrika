import "dotenv/config";
import assert from "node:assert";
import { db } from "../prisma/db";
import { notificationsService } from "../modules/notifications/server/service";
import { dashboardService } from "../modules/dashboard/server/service";
import type { AppUser } from "../middleware/context";

async function loadUser(email: string, roles: AppUser["roles"], businessId: string | null = null): Promise<AppUser> {
  const user = await db.orm.public.User.where({ email }).first();
  if (!user) throw new Error(`Missing seed user: ${email}`);
  return { id: user.id, email: user.email, fullName: user.fullName, roles, phone: user.phone, businessId, isActive: user.isActive };
}

async function main(): Promise<void> {
  const owner = await loadUser("owner.reliance@retail.in", ["INSTRUMENT_OWNER"]);
  const business = await db.orm.public.Business.where({ userId: owner.id }).first();
  assert.ok(business, "missing business");
  owner.businessId = business!.id;

  // Owner dashboard aggregates are populated.
  const ownerStats = await dashboardService.getStats(owner);
  assert.equal(ownerStats.role, "INSTRUMENT_OWNER");
  assert.ok(ownerStats.owner, "owner section missing");
  assert.ok(Object.keys(ownerStats.owner!.instrumentsByStatus).length > 0, "owner should have instruments");

  // State admin sees scoped application counts and workload.
  const stateAdmin = await loadUser("stateadmin.mh@metrika.gov.in", ["STATE_ADMIN"]);
  const adminStats = await dashboardService.getStats(stateAdmin);
  assert.equal(adminStats.role, "STATE_ADMIN");
  assert.ok(adminStats.admin, "admin section missing");
  assert.ok(adminStats.admin!.lmoWorkload.length > 0, "admin should see LMO workload");

  // LMO sees assigned work.
  const lmoUser = await loadUser("lmo.sharma@metrika.gov.in", ["LMO"]);
  const lmoStats = await dashboardService.getStats(lmoUser);
  assert.equal(lmoStats.role, "LMO");
  assert.ok(lmoStats.field, "field section missing");

  // Notifications: owner has rows (seeded + expiry sweep), markRead works.
  const notifications = await notificationsService.listMine({ page: 1, limit: 50, sortOrder: "desc", unreadOnly: false }, owner);
  assert.ok(notifications.items.length > 0, "owner should have notifications");

  const unread = notifications.items.find((n) => !n.isRead);
  if (unread) {
    const result = await notificationsService.markRead({ id: unread.id }, owner);
    assert.equal(result.isRead, true);
    const after = await notificationsService.listMine({ page: 1, limit: 50, sortOrder: "desc", unreadOnly: true }, owner);
    assert.ok(!after.items.some((n) => n.id === unread.id), "marked notification should no longer be unread");
  }

  console.log("dashboard/notifications self-check passed");
}

main()
  .catch((error) => {
    console.error("dashboard/notifications self-check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
