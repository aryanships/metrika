/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `inspections` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/inspections/server/service.ts` or procedures.
 */

export interface InspectionRecord {
  id: string;
  workOrderId: string;
  applicationId: string;
  instrumentId: string;
  performerId: string;
  route: "LMO" | "GATC";
  templateId?: string | null;
  appliedRuleId?: string | null;
  checklistResponses: Record<string, any>;
  measurements: any[];
  result: "PENDING" | "PASSED" | "FAILED";
  notes?: string | null;
  finalizedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const inspectionsRepository = {
  async findById(id: string): Promise<InspectionRecord | null> {
    return null;
  },

  async create(data: Omit<InspectionRecord, "id" | "createdAt" | "updatedAt">): Promise<InspectionRecord> {
    return {
      id: `insp_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
  },

  async update(id: string, data: Partial<InspectionRecord>): Promise<InspectionRecord | null> {
    return null;
  },
};
