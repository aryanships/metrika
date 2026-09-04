import { base } from "@/contracts/base";
import {
  RecommendCandidatesInputSchema,
  RecommendCandidatesOutputSchema,
  AssignWorkOrderInputSchema,
  ScheduleAppointmentInputSchema,
  ListWorkOrdersInputSchema,
  ListWorkOrdersOutputSchema,
  WorkOrderOutputSchema,
} from "./schema";

export const recommendContract = base
  .route({
    method: "GET",
    path: "/scheduling/recommend",
    summary: "Recommend eligible LMO/GATC candidates",
    description: "Evaluates eligible LMOs and GATCs for an application using deterministic multi-factor scoring.",
    tags: ["Scheduling"],
  })
  .input(RecommendCandidatesInputSchema)
  .output(RecommendCandidatesOutputSchema);

export const assignContract = base
  .route({
    method: "POST",
    path: "/scheduling/assign",
    summary: "Assign application to an LMO or GATC",
    description: "State admin confirms the route and creates a WorkOrder for the chosen assignee.",
    tags: ["Scheduling"],
  })
  .input(AssignWorkOrderInputSchema)
  .output(WorkOrderOutputSchema);

export const scheduleContract = base
  .route({
    method: "POST",
    path: "/scheduling/schedule",
    summary: "Schedule inspection appointment",
    description: "Sets the confirmed appointment window for an assigned work order and moves the application to SCHEDULED.",
    tags: ["Scheduling"],
  })
  .input(ScheduleAppointmentInputSchema)
  .output(WorkOrderOutputSchema);

export const listWorkOrdersContract = base
  .route({
    method: "GET",
    path: "/scheduling/work-orders",
    summary: "List work orders",
    description: "Lists assigned work orders for administrators (scoped) and field personnel (own work only).",
    tags: ["Scheduling"],
  })
  .input(ListWorkOrdersInputSchema)
  .output(ListWorkOrdersOutputSchema);

export const schedulingContract = {
  recommend: recommendContract,
  assign: assignContract,
  schedule: scheduleContract,
  listWorkOrders: listWorkOrdersContract,
};
