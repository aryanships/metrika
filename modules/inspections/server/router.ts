import { implement } from "@orpc/server";
import { inspectionsContract } from "../contract";
import { inspectionsService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(inspectionsContract).$context<AppContext>();

export const inspectionsRouter = implementer.router({
  start: implementer.start.use(requireAuth).handler(async ({ input, context }) => {
    const result = await inspectionsService.start(input, context.user!);
    await auditAction(context, "INSPECTION_STARTED", "Application", result.applicationId, result);
    return result;
  }),

  get: implementer.get.use(requireAuth).handler(async ({ input, context }) => {
    return inspectionsService.get(input, context.user!);
  }),

  saveDraft: implementer.saveDraft.use(requireAuth).handler(async ({ input, context }) => {
    return inspectionsService.saveDraft(input, context.user!);
  }),

  submit: implementer.submit.use(requireAuth).handler(async ({ input, context }) => {
    const result = await inspectionsService.submit(input, context.user!);
    await auditAction(context, "INSPECTION_SUBMITTED", "Application", result.applicationId, result);
    return result;
  }),
});
