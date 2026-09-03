/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `organizations` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/organizations/server/service.ts` or procedures.
 */

export interface GatcRecord {
  id: string;
  legalName: string;
  approvalNumber: string;
  stateId: string;
  districtId: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "PENDING_APPROVAL";
  approvalValidUntil: Date;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
}

export interface LmoRecord {
  id: string;
  userId: string;
  employeeId: string;
  designation: string;
  stateId: string;
  districtId: string;
  active: boolean;
  expertiseTypeIds: string[];
  createdAt: Date;
}

export const organizationsRepository = {
  async listGatcs() {
    return [];
  },

  async findGatcById(id: string) {
    return null;
  },

  async createGatc(data: Omit<GatcRecord, "id" | "createdAt">) {
    return {
      id: `gatc_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },

  async listLmos() {
    return [];
  },

  async findLmoById(id: string) {
    return null;
  },

  async createLmo(data: Omit<LmoRecord, "id" | "createdAt">) {
    return {
      id: `lmo_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },
};
