import { implement } from "@orpc/server";
import { organizationsContract } from "../contract";
import { organizationsService } from "./service";
import { requireRole } from "@/middleware/require-role";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(organizationsContract).$context<AppContext>();

const ADMIN_STAFF = ["SYSTEM_ADMIN", "STATE_ADMIN"] as const;

export const organizationsRouter = implementer.router({
  listLmos: implementer.listLmos.use(requireRole("SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN")).handler(
    async ({ input, context }) => organizationsService.listLmos(input, context.user!),
  ),

  createLmo: implementer.createLmo.use(requireRole(...ADMIN_STAFF)).handler(async ({ input, context }) => {
    const created = await organizationsService.createLmo(input, context.user!);
    await auditAction(context, "LMO_PROVISIONED", "Lmo", created.id, created);
    return created;
  }),

  listGatcs: implementer.listGatcs.use(requireRole("SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN")).handler(
    async ({ input, context }) => organizationsService.listGatcs(input, context.user!),
  ),

  createGatc: implementer.createGatc.use(requireRole(...ADMIN_STAFF)).handler(async ({ input, context }) => {
    const created = await organizationsService.createGatc(input, context.user!);
    await auditAction(context, "GATC_PROVISIONED", "Gatc", created.id, created);
    return created;
  }),

  inviteGatcStaff: implementer.inviteGatcStaff.use(requireRole(...ADMIN_STAFF)).handler(
    async ({ input, context }) => {
      const result = await organizationsService.inviteGatcStaff(input, context.user!);
      await auditAction(context, "GATC_STAFF_INVITED", "User", result.userId, result);
      return result;
    },
  ),

  provisionAdmin: implementer.provisionAdmin.use(requireRole("SYSTEM_ADMIN")).handler(
    async ({ input, context }) => {
      const result = await organizationsService.provisionAdmin(input);
      await auditAction(context, "ADMIN_PROVISIONED", "User", result.userId, result);
      return result;
    },
  ),

  listAdmins: implementer.listAdmins.use(requireRole("SYSTEM_ADMIN")).handler(async ({ input }) => {
    return organizationsService.listAdmins(input);
  }),

  setAdminScopes: implementer.setAdminScopes.use(requireRole("SYSTEM_ADMIN")).handler(
    async ({ input, context }) => {
      const result = await organizationsService.setAdminScopes(input);
      await auditAction(context, "ADMIN_SCOPES_SET", "User", result.userId, result);
      return result;
    },
  ),
});
