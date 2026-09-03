import { implement } from "@orpc/server";
import { schedulingContract } from "../contract";
import { schedulingService } from "./service";

const implementer = implement(schedulingContract);

export const schedulingRouter = implementer.router({
  recommend: implementer.recommend.handler(async ({ input }) => {
    return schedulingService.recommend(input);
  }),
  assign: implementer.assign.handler(async ({ input }) => {
    return schedulingService.assign(input);
  }),
  schedule: implementer.schedule.handler(async ({ input }) => {
    return schedulingService.schedule(input);
  }),
  listWorkOrders: implementer.listWorkOrders.handler(async ({ input }) => {
    return schedulingService.listWorkOrders(input);
  }),
});
