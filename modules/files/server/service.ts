import { filesRepository, FileRecord } from "./repository";
import {
  CreateUploadIntentInput,
  UploadIntentOutput,
  ConfirmUploadInput,
  FileMetadataOutput,
  GetDownloadUrlInput,
  DownloadUrlOutput,
} from "../schema";

export const filesService = {
  async createUploadIntent(
    input: CreateUploadIntentInput,
    userId = "usr_demo"
  ): Promise<UploadIntentOutput> {
    const fileId = `file_${Date.now()}`;
    // SECURITY: Storage key is controlled by server and kept strictly internal
    const internalStorageKey = `uploads/${input.category.toLowerCase()}/${fileId}/${input.filename}`;

    await filesRepository.createFile({
      filename: input.filename,
      storageKey: internalStorageKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      category: input.category,
      entityId: input.entityId,
      uploadedById: userId,
      isConfirmed: false,
    });

    return {
      uploadUrl: `https://storage.metrology.example.com/direct-upload/${fileId}`,
      fileId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      maxSizeBytes: input.sizeBytes,
    };
  },

  async confirmUpload(input: ConfirmUploadInput): Promise<FileMetadataOutput> {
    return {
      fileId: input.fileId,
      filename: "evidence_demo.jpg",
      contentType: "image/jpeg",
      sizeBytes: input.actualSizeBytes,
      category: "INSPECTION_EVIDENCE",
      uploadedAt: new Date().toISOString(),
    };
  },

  async getDownloadUrl(input: GetDownloadUrlInput): Promise<DownloadUrlOutput> {
    return {
      downloadUrl: `https://storage.metrology.example.com/download/${input.fileId}?token=temp_signed_token`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      filename: "document_preview.pdf",
      contentType: "application/pdf",
    };
  },
};
