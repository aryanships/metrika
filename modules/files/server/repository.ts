/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `files` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/files/server/service.ts` or procedures.
 */

export interface FileRecord {
  id: string;
  filename: string;
  storageKey: string; // SECURITY: Never return raw storageKey to clients in API responses
  contentType: string;
  sizeBytes: number;
  category: string;
  entityId: string;
  uploadedById: string;
  isConfirmed: boolean;
  createdAt: Date;
}

export const filesRepository = {
  async findById(id: string): Promise<FileRecord | null> {
    return null;
  },

  async createFile(data: Omit<FileRecord, "id" | "createdAt">): Promise<FileRecord> {
    return {
      id: `file_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },

  async confirmFile(id: string, actualSizeBytes: number): Promise<FileRecord | null> {
    return null;
  },
};
