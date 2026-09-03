import { implement } from "@orpc/server";
import { instrumentsContract } from "../contract";
import { instrumentsService } from "./service";

const implementer = implement(instrumentsContract);

export const instrumentsRouter = implementer.router({
  list: implementer.list.handler(async ({ input }) => {
    return instrumentsService.list(input);
  }),
  get: implementer.get.handler(async ({ input }) => {
    return instrumentsService.get(input);
  }),
  create: implementer.create.handler(async ({ input, context }: any) => {
    return instrumentsService.create(input, context?.user?.businessId ?? "biz_demo");
  }),
  update: implementer.update.handler(async ({ input }) => {
    return instrumentsService.update(input);
  }),
  passport: implementer.passport.handler(async ({ input }) => {
    return instrumentsService.passport(input);
  }),
});
