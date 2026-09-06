import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

// Global admin roles only; GATC staff authority is centre-scoped (GatcMembership).
export const AdminRoleSchema = z.enum(["SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "DEPARTMENT_OFFICIAL"]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const GatcStaffRoleSchema = z.enum(["MANAGER", "OPERATOR"]);
export type GatcStaffRole = z.infer<typeof GatcStaffRoleSchema>;

// ---------------------------------------------------------------------------
// LMO
// ---------------------------------------------------------------------------

export const LmoOutputSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  designation: z.string(),
  isActive: z.boolean(),
  baseAdministrativeUnitId: z.string().nullable(),
  email: z.string(),
  fullName: z.string(),
  expertiseTypeIds: z.array(z.string()),
  jurisdictionIds: z.array(z.string()),
  createdAt: z.string(),
});
export type LmoOutput = z.infer<typeof LmoOutputSchema>;

export const ListLmosInputSchema = PaginationInputSchema.extend({
  activeOnly: z.boolean().default(true),
});
export type ListLmosInput = z.infer<typeof ListLmosInputSchema>;

export const ListLmosOutputSchema = z.object({
  items: z.array(LmoOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListLmosOutput = z.infer<typeof ListLmosOutputSchema>;

export const CreateLmoInputSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().optional(),
  employeeId: z.string().min(1, "Employee ID is required"),
  designation: z.string().min(1, "Designation is required"),
  baseAdministrativeUnitId: z.string().min(1, "Base unit is required"),
  expertiseTypeIds: z.array(z.string()).min(1, "At least one expertise type is required"),
  jurisdictionIds: z.array(z.string()).min(1, "At least one jurisdiction is required"),
});
export type CreateLmoInput = z.infer<typeof CreateLmoInputSchema>;

export const LmoCreatedOutputSchema = LmoOutputSchema.extend({
  invitationToken: z.string().nullable(), // demo shortcut: production emails the token instead
});
export type LmoCreatedOutput = z.infer<typeof LmoCreatedOutputSchema>;

// ---------------------------------------------------------------------------
// GATC
// ---------------------------------------------------------------------------

export const GatcOutputSchema = z.object({
  id: z.string(),
  legalName: z.string(),
  approvalNumber: z.string(),
  approvalValidFrom: z.string(),
  approvalValidUntil: z.string(),
  address: z.string(),
  administrativeUnitId: z.string(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  isActive: z.boolean(),
  authorizedTypeIds: z.array(z.string()),
  serviceAreaIds: z.array(z.string()),
  createdAt: z.string(),
});
export type GatcOutput = z.infer<typeof GatcOutputSchema>;

export const ListGatcsInputSchema = PaginationInputSchema.extend({
  activeOnly: z.boolean().default(true),
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
  approvalValidFrom: z.string().datetime(),
  approvalValidUntil: z.string().datetime(),
  address: z.string().min(1, "Address is required"),
  administrativeUnitId: z.string().min(1, "Location unit is required"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  authorizedTypeIds: z.array(z.string()).min(1, "At least one authorized type is required"),
  serviceAreaIds: z.array(z.string()).min(1, "At least one service area is required"),
});
export type CreateGatcInput = z.infer<typeof CreateGatcInputSchema>;

export const InviteGatcStaffInputSchema = z.object({
  gatcId: z.string().min(1, "GATC ID is required"),
  email: z.string().email(),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().optional(),
  role: GatcStaffRoleSchema,
});
export type InviteGatcStaffInput = z.infer<typeof InviteGatcStaffInputSchema>;

export const InviteGatcStaffOutputSchema = z.object({
  gatcId: z.string(),
  userId: z.string(),
  role: GatcStaffRoleSchema,
  invitationToken: z.string().nullable(), // demo shortcut: production emails the token instead
});
export type InviteGatcStaffOutput = z.infer<typeof InviteGatcStaffOutputSchema>;

// ---------------------------------------------------------------------------
// Admin accounts & scopes
// ---------------------------------------------------------------------------

export const ProvisionAdminInputSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().optional(),
  role: AdminRoleSchema,
  scopeAdministrativeUnitIds: z.array(z.string()).default([]),
});
export type ProvisionAdminInput = z.infer<typeof ProvisionAdminInputSchema>;

export const ProvisionAdminOutputSchema = z.object({
  userId: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: AdminRoleSchema,
  scopeAdministrativeUnitIds: z.array(z.string()),
  invitationToken: z.string().nullable(), // demo shortcut: production emails the token instead
});
export type ProvisionAdminOutput = z.infer<typeof ProvisionAdminOutputSchema>;

export const SetAdminScopesInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  administrativeUnitIds: z.array(z.string()),
});
export type SetAdminScopesInput = z.infer<typeof SetAdminScopesInputSchema>;

export const SetAdminScopesOutputSchema = z.object({
  userId: z.string(),
  administrativeUnitIds: z.array(z.string()),
});
export type SetAdminScopesOutput = z.infer<typeof SetAdminScopesOutputSchema>;

export const AdminAccountOutputSchema = z.object({
  userId: z.string(),
  email: z.string(),
  fullName: z.string(),
  isActive: z.boolean(),
  roles: z.array(AdminRoleSchema),
  scopeAdministrativeUnitIds: z.array(z.string()),
});
export type AdminAccountOutput = z.infer<typeof AdminAccountOutputSchema>;

export const ListAdminsInputSchema = PaginationInputSchema;
export type ListAdminsInput = z.infer<typeof ListAdminsInputSchema>;

export const ListAdminsOutputSchema = z.object({
  items: z.array(AdminAccountOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListAdminsOutput = z.infer<typeof ListAdminsOutputSchema>;
