import { implement } from "@orpc/server";
import { inspectionsContract } from "../contract";
import { inspectionsService } from "./service";

const implementer = implement(inspectionsContract);

export const inspectionsRouter = implementer.router({
  start: implementer.start.handler(async ({ input, context }: any) => {
    return inspectionsService.start(input, context?.user?.id ?? "usr_lmo_1");
  }),
  get: implementer.get.handler(async ({ input }) => {
    return inspectionsService.get(input);
  }),
  saveDraft: implementer.saveDraft.handler(async ({ input }) => {
    return inspectionsService.saveDraft(input);
  }),
  submit: implementer.submit.handler(async ({ input }) => {
    return inspectionsService.submit(input);
  }),
});
