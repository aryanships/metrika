import { implement } from "@orpc/server";
import { applicationsContract } from "../contract";
import { applicationsService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import { requireRole } from "@/middleware/require-role";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(applicationsContract).$context<AppContext>();

const OPERATIONAL_ADMIN = ["STATE_ADMIN", "DISTRICT_ADMIN"] as const;

export const applicationsRouter = implementer.router({
  listMine: implementer.listMine
    .use(requireRole("INSTRUMENT_OWNER"))
    .handler(async ({ input, context }) => {
      return applicationsService.listMine(input, context.user?.businessId ?? null);
    }),

  listQueue: implementer.listQueue
    .use(requireRole("STATE_ADMIN", "DISTRICT_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"))
    .handler(async ({ input, context }) => {
      return applicationsService.listQueue(input, context.user!);
    }),

  get: implementer.get.use(requireAuth).handler(async ({ input, context }) => {
    return applicationsService.get(input, context.user!);
  }),

  completeness: implementer.completeness.use(requireAuth).handler(async ({ input, context }) => {
    return applicationsService.completeness(input, context.user!);
  }),

  detail: implementer.detail.use(requireAuth).handler(async ({ input, context }) => {
    return applicationsService.detail(input, context.user!);
  }),

  createDraft: implementer.createDraft
    .use(requireRole("INSTRUMENT_OWNER"))
    .handler(async ({ input, context }) => {
      const created = await applicationsService.createDraft(input, context.user!);
      await auditAction(context, "APPLICATION_DRAFTED", "Application", created.id, created);
      return created;
    }),

  updateDraft: implementer.updateDraft
    .use(requireRole("INSTRUMENT_OWNER"))
    .handler(async ({ input, context }) => {
      return applicationsService.updateDraft(input, context.user!);
    }),

  submit: implementer.submit
    .use(requireRole("INSTRUMENT_OWNER"))
    .handler(async ({ input, context }) => {
      const submitted = await applicationsService.submit(input, context.user!);
      await auditAction(context, "APPLICATION_SUBMITTED", "Application", submitted.id, submitted);
      return submitted;
    }),

  cancel: implementer.cancel
    .use(requireRole("INSTRUMENT_OWNER"))
    .handler(async ({ input, context }) => {
      const cancelled = await applicationsService.cancel(input, context.user!);
      await auditAction(context, "APPLICATION_CANCELLED", "Application", cancelled.id, cancelled);
      return cancelled;
    }),

  startReview: implementer.startReview
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      const updated = await applicationsService.startReview(input, context.user!);
      await auditAction(context, "APPLICATION_REVIEW_STARTED", "Application", updated.id, updated);
      return updated;
    }),

  requestCorrections: implementer.requestCorrections
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      const updated = await applicationsService.requestCorrections(input, context.user!);
      await auditAction(context, "APPLICATION_CORRECTIONS_REQUESTED", "Application", updated.id, updated);
      return updated;
    }),

  approve: implementer.approve
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      const updated = await applicationsService.approve(input, context.user!);
      await auditAction(context, "APPLICATION_APPROVED", "Application", updated.id, updated);
      return updated;
    }),

  reject: implementer.reject
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      const updated = await applicationsService.reject(input, context.user!);
      await auditAction(context, "APPLICATION_REJECTED", "Application", updated.id, updated);
      return updated;
    }),

  setPriority: implementer.setPriority
    .use(requireRole(...OPERATIONAL_ADMIN))
    .handler(async ({ input, context }) => {
      const updated = await applicationsService.setPriority(input, context.user!);
      await auditAction(context, "APPLICATION_PRIORITY_CHANGED", "Application", updated.id, updated);
      return updated;
    }),
});
