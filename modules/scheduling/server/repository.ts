/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `scheduling` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/scheduling/server/service.ts` or procedures.
 */

export interface WorkOrderRecord {
  id: string;
  orderNumber: string;
  applicationId: string;
  route: "LMO" | "GATC";
  lmoId?: string | null;
  gatcId?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  status: "PENDING" | "ASSIGNED" | "SCHEDULED" | "COMPLETED" | "CANCELLED";
  assignedAt: Date;
  createdAt: Date;
}

export const schedulingRepository = {
  async listWorkOrders() {
    return [];
  },

  async findById(id: string): Promise<WorkOrderRecord | null> {
    return null;
  },

  async createWorkOrder(data: Omit<WorkOrderRecord, "id" | "createdAt">): Promise<WorkOrderRecord> {
    return {
      id: `wo_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },

  async updateWorkOrder(id: string, data: Partial<WorkOrderRecord>): Promise<WorkOrderRecord | null> {
    return null;
  },
};
