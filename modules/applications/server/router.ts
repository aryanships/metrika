import { implement } from "@orpc/server";
import { applicationsContract } from "../contract";
import { applicationsService } from "./service";

const implementer = implement(applicationsContract);

export const applicationsRouter = implementer.router({
  listMine: implementer.listMine.handler(async ({ input, context }: any) => {
    return applicationsService.listMine(input, context?.user?.businessId ?? "biz_demo");
  }),
  get: implementer.get.handler(async ({ input }) => {
    return applicationsService.get(input);
  }),
  createDraft: implementer.createDraft.handler(async ({ input, context }: any) => {
    return applicationsService.createDraft(input, context?.user?.businessId ?? "biz_demo");
  }),
  updateDraft: implementer.updateDraft.handler(async ({ input }) => {
    return applicationsService.updateDraft(input);
  }),
  submit: implementer.submit.handler(async ({ input }) => {
    return applicationsService.submit(input);
  }),
  cancel: implementer.cancel.handler(async ({ input }) => {
    return applicationsService.cancel(input);
  }),
  startReview: implementer.startReview.handler(async ({ input, context }: any) => {
    return applicationsService.startReview(input, context?.user?.id ?? "usr_admin");
  }),
  requestCorrections: implementer.requestCorrections.handler(async ({ input }) => {
    return applicationsService.requestCorrections(input);
  }),
  approve: implementer.approve.handler(async ({ input }) => {
    return applicationsService.approve(input);
  }),
  reject: implementer.reject.handler(async ({ input }) => {
    return applicationsService.reject(input);
  }),
});
