import { implement } from "@orpc/server";
import { verificationContract } from "../contract";
import { verificationService } from "./service";
import type { AppContext } from "@/middleware/context";

const implementer = implement(verificationContract).$context<AppContext>();

export const verificationRouter = implementer.router({
  verifyCertificate: implementer.verifyCertificate.handler(async ({ input, context }) => {
    return verificationService.verifyCertificate(input, context.clientIp ?? undefined);
  }),
});
