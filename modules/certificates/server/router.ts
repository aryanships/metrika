import { implement } from "@orpc/server";
import { certificatesContract } from "../contract";
import { certificatesService } from "./service";

const implementer = implement(certificatesContract);

export const certificatesRouter = implementer.router({
  listMine: implementer.listMine.handler(async ({ input, context }: any) => {
    return certificatesService.listMine(input, context?.user?.id ?? "usr_demo");
  }),
  get: implementer.get.handler(async ({ input }) => {
    return certificatesService.get(input);
  }),
  downloadPdf: implementer.downloadPdf.handler(async ({ input }) => {
    return certificatesService.downloadPdf(input);
  }),
});
