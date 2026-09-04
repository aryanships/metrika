import { implement } from "@orpc/server";
import { filesContract } from "../contract";
import { filesService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import type { AppContext } from "@/middleware/context";

const implementer = implement(filesContract).$context<AppContext>();

export const filesRouter = implementer.router({
  createUploadIntent: implementer.createUploadIntent.use(requireAuth).handler(async ({ input, context }) => {
    return filesService.createUploadIntent(input, context.user!);
  }),
  confirmUpload: implementer.confirmUpload.use(requireAuth).handler(async ({ input, context }) => {
    return filesService.confirmUpload(input, context.user!);
  }),
  getDownloadUrl: implementer.getDownloadUrl.use(requireAuth).handler(async ({ input, context }) => {
    return filesService.getDownloadUrl(input, context.user!);
  }),
});
