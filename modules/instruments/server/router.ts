import { implement } from "@orpc/server";
import { instrumentsContract } from "../contract";
import { instrumentsService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import { requireRole } from "@/middleware/require-role";
import { requireInstrumentOwnership } from "@/middleware/guards";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(instrumentsContract).$context<AppContext>();

export const instrumentsRouter = implementer.router({
  list: implementer.list.use(requireRole("INSTRUMENT_OWNER")).handler(async ({ input, context }) => {
    return instrumentsService.list(input, context.user?.businessId ?? null);
  }),

  get: implementer.get.use(requireAuth).handler(async ({ input, context }) => {
    await requireInstrumentOwnership(context.user!, input.id);
    return instrumentsService.get(input);
  }),

  create: implementer.create.use(requireRole("INSTRUMENT_OWNER")).handler(async ({ input, context }) => {
    const created = await instrumentsService.create(input, context.user?.businessId ?? null);
    await auditAction(context, "INSTRUMENT_CREATED", "Instrument", created.id, created);
    return created;
  }),

  update: implementer.update.use(requireAuth).handler(async ({ input, context }) => {
    await requireInstrumentOwnership(context.user!, input.id);
    const before = await instrumentsService.get(input);
    const updated = await instrumentsService.update(input);
    await auditAction(context, "INSTRUMENT_UPDATED", "Instrument", updated.id, { before, after: updated });
    return updated;
  }),

  passport: implementer.passport.use(requireAuth).handler(async ({ input, context }) => {
    await requireInstrumentOwnership(context.user!, input.id);
    return instrumentsService.passport(input);
  }),
});
