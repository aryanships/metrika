import { z } from "zod";
import { IdParamSchema, PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const DeletedOutputSchema = z.object({ id: z.string() });
export type DeletedOutput = z.infer<typeof DeletedOutputSchema>;

// ---------------------------------------------------------------------------
// Administrative units (State -> District -> Tehsil -> Village)
// ---------------------------------------------------------------------------

export const AdminUnitTypeSchema = z.enum(["STATE", "DISTRICT", "TEHSIL", "VILLAGE"]);
export type AdminUnitType = z.infer<typeof AdminUnitTypeSchema>;

export const AdministrativeUnitOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AdminUnitTypeSchema,
  parentId: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
});
export type AdministrativeUnitOutput = z.infer<typeof AdministrativeUnitOutputSchema>;

export const ListAdministrativeUnitsInputSchema = PaginationInputSchema.extend({
  parentId: z.string().optional(),
  type: AdminUnitTypeSchema.optional(),
});
export type ListAdministrativeUnitsInput = z.infer<typeof ListAdministrativeUnitsInputSchema>;

export const ListAdministrativeUnitsOutputSchema = z.object({
  items: z.array(AdministrativeUnitOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListAdministrativeUnitsOutput = z.infer<typeof ListAdministrativeUnitsOutputSchema>;

export const CreateAdministrativeUnitInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: AdminUnitTypeSchema,
  parentId: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
export type CreateAdministrativeUnitInput = z.infer<typeof CreateAdministrativeUnitInputSchema>;

export const UpdateAdministrativeUnitInputSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
export type UpdateAdministrativeUnitInput = z.infer<typeof UpdateAdministrativeUnitInputSchema>;

export const DeleteAdministrativeUnitInputSchema = IdParamSchema;

// ---------------------------------------------------------------------------
// Instrument types (controlled master categories)
// ---------------------------------------------------------------------------

export const InstrumentTypeOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  unit: z.string(),
});
export type InstrumentTypeOutput = z.infer<typeof InstrumentTypeOutputSchema>;

export const ListInstrumentTypesInputSchema = PaginationInputSchema;
export type ListInstrumentTypesInput = z.infer<typeof ListInstrumentTypesInputSchema>;

export const ListInstrumentTypesOutputSchema = z.object({
  items: z.array(InstrumentTypeOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListInstrumentTypesOutput = z.infer<typeof ListInstrumentTypesOutputSchema>;

export const CreateInstrumentTypeInputSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
});
export type CreateInstrumentTypeInput = z.infer<typeof CreateInstrumentTypeInputSchema>;

export const UpdateInstrumentTypeInputSchema = z.object({
  id: z.string().min(1, "ID is required"),
  code: z.string().min(1, "Code is required").optional(),
  name: z.string().min(1, "Name is required").optional(),
  unit: z.string().min(1, "Unit is required").optional(),
});
export type UpdateInstrumentTypeInput = z.infer<typeof UpdateInstrumentTypeInputSchema>;

export const DeleteInstrumentTypeInputSchema = IdParamSchema;

// ---------------------------------------------------------------------------
// Regulatory rules (versioned by effective window; decimals are strings)
// ---------------------------------------------------------------------------

export const RegulatoryRuleOutputSchema = z.object({
  id: z.string(),
  instrumentTypeId: z.string(),
  accuracyClass: z.string(),
  capacityMin: z.string(),
  capacityMax: z.string(),
  permissibleError: z.string(),
  verificationPeriodMonths: z.number().int(),
  effectiveFrom: z.string(),
  effectiveUntil: z.string().nullable(),
});
export type RegulatoryRuleOutput = z.infer<typeof RegulatoryRuleOutputSchema>;

export const ListRegulatoryRulesInputSchema = PaginationInputSchema.extend({
  instrumentTypeId: z.string().optional(),
  accuracyClass: z.string().optional(),
});
export type ListRegulatoryRulesInput = z.infer<typeof ListRegulatoryRulesInputSchema>;

export const ListRegulatoryRulesOutputSchema = z.object({
  items: z.array(RegulatoryRuleOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListRegulatoryRulesOutput = z.infer<typeof ListRegulatoryRulesOutputSchema>;

export const CreateRegulatoryRuleInputSchema = z.object({
  instrumentTypeId: z.string().min(1, "Instrument type is required"),
  accuracyClass: z.string().min(1, "Accuracy class is required"),
  capacityMin: z.string().min(1, "Capacity minimum is required"),
  capacityMax: z.string().min(1, "Capacity maximum is required"),
  permissibleError: z.string().min(1, "Permissible error is required"),
  verificationPeriodMonths: z.number().int().positive(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
});
export type CreateRegulatoryRuleInput = z.infer<typeof CreateRegulatoryRuleInputSchema>;

export const UpdateRegulatoryRuleInputSchema = z.object({
  id: z.string().min(1, "ID is required"),
  accuracyClass: z.string().min(1).optional(),
  capacityMin: z.string().min(1).optional(),
  capacityMax: z.string().min(1).optional(),
  permissibleError: z.string().min(1).optional(),
  verificationPeriodMonths: z.number().int().positive().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
});
export type UpdateRegulatoryRuleInput = z.infer<typeof UpdateRegulatoryRuleInputSchema>;

export const DeleteRegulatoryRuleInputSchema = IdParamSchema;

// ---------------------------------------------------------------------------
// Inspection templates (versioned, with ordered items)
// ---------------------------------------------------------------------------

export const InspectionTemplateItemKindSchema = z.enum([
  "CHECKLIST",
  "NUMERIC",
  "TEXT",
  "SELECT",
  "MEASUREMENT",
]);
export type InspectionTemplateItemKind = z.infer<typeof InspectionTemplateItemKindSchema>;

export const InspectionTemplateItemOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  kind: InspectionTemplateItemKindSchema,
  unit: z.string().nullable(),
  isRequired: z.boolean(),
  displayOrder: z.number().int(),
});
export type InspectionTemplateItemOutput = z.infer<typeof InspectionTemplateItemOutputSchema>;

export const InspectionTemplateOutputSchema = z.object({
  id: z.string(),
  instrumentTypeId: z.string(),
  code: z.string(),
  name: z.string(),
  version: z.number().int(),
  effectiveFrom: z.string(),
  effectiveUntil: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  items: z.array(InspectionTemplateItemOutputSchema),
});
export type InspectionTemplateOutput = z.infer<typeof InspectionTemplateOutputSchema>;

export const ListInspectionTemplatesInputSchema = PaginationInputSchema.extend({
  instrumentTypeId: z.string().optional(),
});
export type ListInspectionTemplatesInput = z.infer<typeof ListInspectionTemplatesInputSchema>;

export const ListInspectionTemplatesOutputSchema = z.object({
  items: z.array(InspectionTemplateOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListInspectionTemplatesOutput = z.infer<typeof ListInspectionTemplatesOutputSchema>;

export const CreateInspectionTemplateItemInputSchema = z.object({
  code: z.string().min(1, "Item code is required"),
  label: z.string().min(1, "Item label is required"),
  kind: InspectionTemplateItemKindSchema,
  unit: z.string().optional(),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int(),
});
export type CreateInspectionTemplateItemInput = z.infer<typeof CreateInspectionTemplateItemInputSchema>;

export const CreateInspectionTemplateInputSchema = z.object({
  instrumentTypeId: z.string().min(1, "Instrument type is required"),
  code: z.string().min(1, "Template code is required"),
  name: z.string().min(1, "Template name is required"),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  items: z.array(CreateInspectionTemplateItemInputSchema).min(1, "At least one item is required"),
});
export type CreateInspectionTemplateInput = z.infer<typeof CreateInspectionTemplateInputSchema>;

export const UpdateInspectionTemplateInputSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateInspectionTemplateInput = z.infer<typeof UpdateInspectionTemplateInputSchema>;

export const DeleteInspectionTemplateInputSchema = IdParamSchema;
