import { implement } from "@orpc/server";
import { authContract } from "../contract";
import { authService } from "./service";

const implementer = implement(authContract);

export const authRouter = implementer.router({
  registerOwner: implementer.registerOwner.handler(async ({ input }) => {
    return authService.registerOwner(input);
  }),
  login: implementer.login.handler(async ({ input }) => {
    return authService.login(input);
  }),
  logout: implementer.logout.handler(async () => {
    return authService.logout();
  }),
  me: implementer.me.handler(async ({ context }: any) => {
    return authService.getCurrentUser(context?.user?.id);
  }),
  acceptInvitation: implementer.acceptInvitation.handler(async ({ input }) => {
    return authService.acceptInvitation(input);
  }),
});
