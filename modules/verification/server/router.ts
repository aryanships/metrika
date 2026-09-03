import { implement } from "@orpc/server";
import { verificationContract } from "../contract";
import { verificationService } from "./service";

const implementer = implement(verificationContract);

export const verificationRouter = implementer.router({
  verifyCertificate: implementer.verifyCertificate.handler(async ({ input, context }: any) => {
    const ip = context?.headers?.get("x-forwarded-for") ?? undefined;
    return verificationService.verifyCertificate(input, ip);
  }),
});
