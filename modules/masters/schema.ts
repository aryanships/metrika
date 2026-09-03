import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const AdminUnitTypeSchema = z.enum(["STATE", "DISTRICT", "TEHSIL", "VILLAGE"]);
export type AdminUnitType = z.infer<typeof AdminUnitTypeSchema>;

export const AdministrativeUnitOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: AdminUnitTypeSchema,
  parentId: z.string().nullable().optional(),
  active: z.boolean(),
  createdAt: z.string(),
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
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  type: AdminUnitTypeSchema,
  parentId: z.string().optional(),
});
export type CreateAdministrativeUnitInput = z.infer<typeof CreateAdministrativeUnitInputSchema>;

export const InstrumentTypeOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.string(),
  active: z.boolean(),
  description: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type InstrumentTypeOutput = z.infer<typeof InstrumentTypeOutputSchema>;

export const ListInstrumentTypesInputSchema = PaginationInputSchema.extend({
  category: z.string().optional(),
  activeOnly: z.boolean().optional().default(true),
});
export type ListInstrumentTypesInput = z.infer<typeof ListInstrumentTypesInputSchema>;

export const ListInstrumentTypesOutputSchema = z.object({
  items: z.array(InstrumentTypeOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListInstrumentTypesOutput = z.infer<typeof ListInstrumentTypesOutputSchema>;

export const CreateInstrumentTypeInputSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});
export type CreateInstrumentTypeInput = z.infer<typeof CreateInstrumentTypeInputSchema>;

export const RegulatoryRuleOutputSchema = z.object({
  id: z.string(),
  instrumentTypeId: z.string(),
  accuracyClass: z.string(),
  capacityMin: z.number(),
  capacityMax: z.number(),
  verificationPeriodMonths: z.number(),
  permissibleError: z.number(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type RegulatoryRuleOutput = z.infer<typeof RegulatoryRuleOutputSchema>;

export const ListRegulatoryRulesInputSchema = PaginationInputSchema.extend({
  instrumentTypeId: z.string().optional(),
  activeOnly: z.boolean().optional().default(true),
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
  capacityMin: z.number().nonnegative(),
  capacityMax: z.number().positive(),
  verificationPeriodMonths: z.number().int().positive(),
  permissibleError: z.number().positive(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
});
export type CreateRegulatoryRuleInput = z.infer<typeof CreateRegulatoryRuleInputSchema>;

export const InspectionTemplateOutputSchema = z.object({
  id: z.string(),
  instrumentTypeId: z.string(),
  version: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  schemaJson: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type InspectionTemplateOutput = z.infer<typeof InspectionTemplateOutputSchema>;

export const ListInspectionTemplatesInputSchema = PaginationInputSchema.extend({
  instrumentTypeId: z.string().optional(),
  activeOnly: z.boolean().optional().default(true),
});
export type ListInspectionTemplatesInput = z.infer<typeof ListInspectionTemplatesInputSchema>;

export const ListInspectionTemplatesOutputSchema = z.object({
  items: z.array(InspectionTemplateOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListInspectionTemplatesOutput = z.infer<typeof ListInspectionTemplatesOutputSchema>;

export const CreateInspectionTemplateInputSchema = z.object({
  instrumentTypeId: z.string().min(1, "Instrument type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  schemaJson: z.string().min(2, "Template schema JSON is required"),
});
export type CreateInspectionTemplateInput = z.infer<typeof CreateInspectionTemplateInputSchema>;
