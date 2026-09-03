import { schedulingRepository, WorkOrderRecord } from "./repository";
import {
  RecommendCandidatesInput,
  RecommendCandidatesOutput,
  AssignWorkOrderInput,
  ScheduleAppointmentInput,
  ListWorkOrdersInput,
  ListWorkOrdersOutput,
  WorkOrderOutput,
} from "../schema";

function toSafeWorkOrderOutput(rec: WorkOrderRecord): WorkOrderOutput {
  return {
    id: rec.id,
    orderNumber: rec.orderNumber,
    applicationId: rec.applicationId,
    route: rec.route,
    lmoId: rec.lmoId ?? null,
    gatcId: rec.gatcId ?? null,
    scheduledStart: rec.scheduledStart ? rec.scheduledStart.toISOString() : null,
    scheduledEnd: rec.scheduledEnd ? rec.scheduledEnd.toISOString() : null,
    status: rec.status,
    assignedAt: rec.assignedAt.toISOString(),
    createdAt: rec.createdAt.toISOString(),
  };
}

export const schedulingService = {
  async recommend(input: RecommendCandidatesInput): Promise<RecommendCandidatesOutput> {
    return {
      applicationId: input.applicationId,
      recommendedRoute: "LMO",
      candidates: [
        {
          candidateId: "lmo_demo_officer",
          candidateType: "LMO",
          name: "Inspector Rajesh Sharma (LMO-DL-042)",
          totalScore: 94.5,
          breakdown: {
            distanceScore: 95.0,
            workloadScore: 92.0,
            availabilityScore: 96.0,
            expertiseMatch: true,
          },
          currentWorkload: 3,
          estimatedDistanceKm: 4.2,
        },
        {
          candidateId: "gatc_delhi_central",
          candidateType: "GATC",
          name: "Apex Metrology Solutions Ltd (GATC-DL-2024-001)",
          totalScore: 88.0,
          breakdown: {
            distanceScore: 85.0,
            workloadScore: 90.0,
            availabilityScore: 89.0,
            expertiseMatch: true,
          },
          currentWorkload: 8,
          estimatedDistanceKm: 12.5,
        },
      ],
    };
  },

  async assign(input: AssignWorkOrderInput): Promise<WorkOrderOutput> {
    const created = await schedulingRepository.createWorkOrder({
      orderNumber: `WO-${Date.now().toString().slice(-6)}`,
      applicationId: input.applicationId,
      route: input.route,
      lmoId: input.route === "LMO" ? input.assigneeId : null,
      gatcId: input.route === "GATC" ? input.assigneeId : null,
      scheduledStart: null,
      scheduledEnd: null,
      status: "ASSIGNED",
      assignedAt: new Date(),
    });
    return toSafeWorkOrderOutput(created);
  },

  async schedule(input: ScheduleAppointmentInput): Promise<WorkOrderOutput> {
    const mock: WorkOrderRecord = {
      id: input.workOrderId,
      orderNumber: "WO-2024-0891",
      applicationId: "app_demo_1",
      route: "LMO",
      lmoId: "lmo_demo_officer",
      gatcId: null,
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: new Date(input.scheduledEnd),
      status: "SCHEDULED",
      assignedAt: new Date(),
      createdAt: new Date(),
    };
    return toSafeWorkOrderOutput(mock);
  },

  async listWorkOrders(input: ListWorkOrdersInput): Promise<ListWorkOrdersOutput> {
    const mock: WorkOrderRecord = {
      id: "wo_demo_1",
      orderNumber: "WO-2024-0891",
      applicationId: "app_demo_1",
      route: "LMO",
      lmoId: "lmo_demo_officer",
      gatcId: null,
      scheduledStart: new Date("2024-02-02T10:00:00Z"),
      scheduledEnd: new Date("2024-02-02T12:00:00Z"),
      status: "SCHEDULED",
      assignedAt: new Date(),
      createdAt: new Date(),
    };

    return {
      items: [toSafeWorkOrderOutput(mock)],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },
};
