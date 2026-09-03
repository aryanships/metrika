import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const GatcStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "PENDING_APPROVAL"]);
export type GatcStatus = z.infer<typeof GatcStatusSchema>;

export const GatcOutputSchema = z.object({
  id: z.string(),
  legalName: z.string(),
  approvalNumber: z.string(),
  stateId: z.string(),
  districtId: z.string(),
  status: GatcStatusSchema,
  approvalValidUntil: z.string(),
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  createdAt: z.string(),
});
export type GatcOutput = z.infer<typeof GatcOutputSchema>;

export const ListGatcsInputSchema = PaginationInputSchema.extend({
  stateId: z.string().optional(),
  status: GatcStatusSchema.optional(),
});
export type ListGatcsInput = z.infer<typeof ListGatcsInputSchema>;

export const ListGatcsOutputSchema = z.object({
  items: z.array(GatcOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListGatcsOutput = z.infer<typeof ListGatcsOutputSchema>;

export const CreateGatcInputSchema = z.object({
  legalName: z.string().min(2, "Legal name is required"),
  approvalNumber: z.string().min(1, "Approval number is required"),
  stateId: z.string().min(1, "State ID is required"),
  districtId: z.string().min(1, "District ID is required"),
  approvalValidUntil: z.string().datetime(),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
  authorizedTypeIds: z.array(z.string()).min(1, "At least one instrument type must be authorized"),
});
export type CreateGatcInput = z.infer<typeof CreateGatcInputSchema>;

export const InviteGatcStaffInputSchema = z.object({
  gatcId: z.string().min(1, "GATC ID is required"),
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["GATC_MANAGER", "GATC_OPERATOR"]),
});
export type InviteGatcStaffInput = z.infer<typeof InviteGatcStaffInputSchema>;

export const InviteStaffOutputSchema = z.object({
  success: z.boolean(),
  invitationId: z.string(),
  email: z.string(),
  message: z.string(),
});
export type InviteStaffOutput = z.infer<typeof InviteStaffOutputSchema>;

export const LmoOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  employeeId: z.string(),
  designation: z.string(),
  stateId: z.string(),
  districtId: z.string(),
  active: z.boolean(),
  expertiseTypeIds: z.array(z.string()),
  createdAt: z.string(),
});
export type LmoOutput = z.infer<typeof LmoOutputSchema>;

export const ListLmosInputSchema = PaginationInputSchema.extend({
  stateId: z.string().optional(),
  districtId: z.string().optional(),
  activeOnly: z.boolean().optional().default(true),
});
export type ListLmosInput = z.infer<typeof ListLmosInputSchema>;

export const ListLmosOutputSchema = z.object({
  items: z.array(LmoOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListLmosOutput = z.infer<typeof ListLmosOutputSchema>;

export const CreateLmoInputSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  employeeId: z.string().min(1, "Employee ID is required"),
  designation: z.string().min(1, "Designation is required"),
  stateId: z.string().min(1, "State ID is required"),
  districtId: z.string().min(1, "District ID is required"),
  jurisdictionIds: z.array(z.string()).min(1, "At least one jurisdiction required"),
  expertiseTypeIds: z.array(z.string()).min(1, "At least one instrument type expertise required"),
});
export type CreateLmoInput = z.infer<typeof CreateLmoInputSchema>;
