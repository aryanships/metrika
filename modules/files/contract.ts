import { base } from "@/contracts/base";
import {
  AttachmentOutputSchema,
  ConfirmUploadInputSchema,
  CreateUploadIntentInputSchema,
  DownloadUrlOutputSchema,
  GetDownloadUrlInputSchema,
  UploadIntentOutputSchema,
} from "./schema";

export const createUploadIntentContract = base
  .route({
    method: "POST",
    path: "/files/upload-intent",
    successStatus: 201,
    summary: "Request signed upload intent",
    description: "Validates file policy and authorization, then issues a temporary pre-signed PUT URL for direct upload.",
    tags: ["Files"],
  })
  .input(CreateUploadIntentInputSchema)
  .output(UploadIntentOutputSchema);

export const confirmUploadContract = base
  .route({
    method: "POST",
    path: "/files/confirm",
    summary: "Confirm completed file upload",
    description: "Verifies the uploaded object in storage and commits FileObject and Attachment metadata.",
    tags: ["Files"],
  })
  .input(ConfirmUploadInputSchema)
  .output(AttachmentOutputSchema);

export const getDownloadUrlContract = base
  .route({
    method: "GET",
    path: "/files/{fileId}/download",
    summary: "Get temporary download URL",
    description: "Issues a time-limited signed URL to download private evidence or documents.",
    tags: ["Files"],
  })
  .input(GetDownloadUrlInputSchema)
  .output(DownloadUrlOutputSchema);

export const filesContract = {
  createUploadIntent: createUploadIntentContract,
  confirmUpload: confirmUploadContract,
  getDownloadUrl: getDownloadUrlContract,
};
