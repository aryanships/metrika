/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `applications` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/applications/server/service.ts` or procedures.
 */

export interface ApplicationRecord {
  id: string;
  applicationNumber: string;
  businessId: string;
  instrumentId: string;
  type: string;
  status: string;
  preferredDateStart?: Date | null;
  preferredDateEnd?: Date | null;
  submittedAt?: Date | null;
  reviewedById?: string | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const applicationsRepository = {
  async list() {
    return [];
  },

  async findById(id: string): Promise<ApplicationRecord | null> {
    return null;
  },

  async create(data: Omit<ApplicationRecord, "id" | "createdAt" | "updatedAt">): Promise<ApplicationRecord> {
    return {
      id: `app_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
  },

  async update(id: string, data: Partial<ApplicationRecord>): Promise<ApplicationRecord | null> {
    return null;
  },
};
