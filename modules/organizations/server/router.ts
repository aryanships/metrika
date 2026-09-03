import { implement } from "@orpc/server";
import { organizationsContract } from "../contract";
import { organizationsService } from "./service";

const implementer = implement(organizationsContract);

export const organizationsRouter = implementer.router({
  listGatcs: implementer.listGatcs.handler(async ({ input }) => {
    return organizationsService.listGatcs(input);
  }),
  createGatc: implementer.createGatc.handler(async ({ input }) => {
    return organizationsService.createGatc(input);
  }),
  inviteGatcStaff: implementer.inviteGatcStaff.handler(async ({ input }) => {
    return organizationsService.inviteGatcStaff(input);
  }),
  listLmos: implementer.listLmos.handler(async ({ input }) => {
    return organizationsService.listLmos(input);
  }),
  createLmo: implementer.createLmo.handler(async ({ input }) => {
    return organizationsService.createLmo(input);
  }),
});
