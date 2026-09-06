import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const RouteTypeSchema = z.enum(["LMO", "GATC"]);
export type RouteType = z.infer<typeof RouteTypeSchema>;

export const CandidateScoreSchema = z.object({
  candidateId: z.string(),
  candidateType: RouteTypeSchema,
  name: z.string(),
  detail: z.string(),
  totalScore: z.number(),
  breakdown: z.object({
    distanceScore: z.number(),
    workloadScore: z.number(),
    availabilityScore: z.number(),
  }),
  currentWorkload: z.number().int(),
  estimatedDistanceKm: z.number().nullable(),
});
export type CandidateScore = z.infer<typeof CandidateScoreSchema>;

export const RecommendCandidatesInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
});
export type RecommendCandidatesInput = z.infer<typeof RecommendCandidatesInputSchema>;

export const RecommendCandidatesOutputSchema = z.object({
  applicationId: z.string(),
  recommendedRoute: RouteTypeSchema,
  candidates: z.array(CandidateScoreSchema),
});
export type RecommendCandidatesOutput = z.infer<typeof RecommendCandidatesOutputSchema>;

export const AssignWorkOrderInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  route: RouteTypeSchema,
  assigneeId: z.string().min(1, "Assignee ID (LMO ID or GATC ID) is required"),
  overrideReason: z.string().optional(),
});
export type AssignWorkOrderInput = z.infer<typeof AssignWorkOrderInputSchema>;

export const ScheduleAppointmentInputSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime(),
  location: z.string().optional(),
});
export type ScheduleAppointmentInput = z.infer<typeof ScheduleAppointmentInputSchema>;

export const WorkOrderOutputSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  route: RouteTypeSchema,
  lmoId: z.string().nullable(),
  gatcId: z.string().nullable(),
  recommendedScore: z.string().nullable(),
  wasOverridden: z.boolean(),
  assignedById: z.string(),
  assignedAt: z.string(),
  scheduledStartAt: z.string().nullable(),
  scheduledEndAt: z.string().nullable(),
  location: z.string().nullable(),
});
export type WorkOrderOutput = z.infer<typeof WorkOrderOutputSchema>;

export const ListWorkOrdersInputSchema = PaginationInputSchema.extend({
  route: RouteTypeSchema.optional(),
  applicationId: z.string().optional(),
});
export type ListWorkOrdersInput = z.infer<typeof ListWorkOrdersInputSchema>;

export const ListWorkOrdersOutputSchema = z.object({
  items: z.array(WorkOrderOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListWorkOrdersOutput = z.infer<typeof ListWorkOrdersOutputSchema>;
