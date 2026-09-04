import { implement } from "@orpc/server";
import { businessesContract } from "../contract";
import { businessesService } from "./service";
import { requireRole } from "@/middleware/require-role";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(businessesContract).$context<AppContext>();

export const businessesRouter = implementer.router({
  get: implementer.get.use(requireRole("INSTRUMENT_OWNER")).handler(async ({ context }) => {
    return businessesService.get(context.user!.id);
  }),

  save: implementer.save.use(requireRole("INSTRUMENT_OWNER")).handler(async ({ input, context }) => {
    const saved = await businessesService.save(context.user!.id, input);
    await auditAction(context, "BUSINESS_SAVED", "Business", saved.id, saved);
    return saved;
  }),
});
