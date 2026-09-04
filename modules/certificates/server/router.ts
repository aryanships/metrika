import { implement } from "@orpc/server";
import { certificatesContract } from "../contract";
import { certificatesService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import { requireRole } from "@/middleware/require-role";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(certificatesContract).$context<AppContext>();

const ISSUE_ROLES = [
  "STATE_ADMIN",
  "DISTRICT_ADMIN",
  "SYSTEM_ADMIN",
  "DEPARTMENT_OFFICIAL",
  "LMO",
] as const;

export const certificatesRouter = implementer.router({
  listMine: implementer.listMine
    .use(requireRole("INSTRUMENT_OWNER"))
    .handler(async ({ input, context }) => {
      return certificatesService.listMine(input, context.user!);
    }),

  get: implementer.get.use(requireAuth).handler(async ({ input, context }) => {
    return certificatesService.get(input, context.user!);
  }),

  issue: implementer.issue
    .use(requireRole(...ISSUE_ROLES))
    .handler(async ({ input, context }) => {
      const issued = await certificatesService.issue(input, context.user!);
      await auditAction(context, "CERTIFICATE_ISSUED", "Certificate", issued.id, issued);
      return issued;
    }),

  updateStatus: implementer.updateStatus
    .use(requireRole("STATE_ADMIN", "DISTRICT_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"))
    .handler(async ({ input, context }) => {
      const updated = await certificatesService.updateStatus(input, context.user!);
      await auditAction(context, "CERTIFICATE_STATUS_CHANGED", "Certificate", updated.id, updated);
      return updated;
    }),
});
