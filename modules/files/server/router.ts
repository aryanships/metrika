import { implement } from "@orpc/server";
import { filesContract } from "../contract";
import { filesService } from "./service";

const implementer = implement(filesContract);

export const filesRouter = implementer.router({
  createUploadIntent: implementer.createUploadIntent.handler(async ({ input, context }: any) => {
    return filesService.createUploadIntent(input, context?.user?.id ?? "usr_demo");
  }),
  confirmUpload: implementer.confirmUpload.handler(async ({ input }) => {
    return filesService.confirmUpload(input);
  }),
  getDownloadUrl: implementer.getDownloadUrl.handler(async ({ input }) => {
    return filesService.getDownloadUrl(input);
  }),
});
