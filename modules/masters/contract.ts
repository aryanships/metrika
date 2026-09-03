import { base } from "@/contracts/base";
import {
  ListAdministrativeUnitsInputSchema,
  ListAdministrativeUnitsOutputSchema,
  CreateAdministrativeUnitInputSchema,
  AdministrativeUnitOutputSchema,
  ListInstrumentTypesInputSchema,
  ListInstrumentTypesOutputSchema,
  CreateInstrumentTypeInputSchema,
  InstrumentTypeOutputSchema,
  ListRegulatoryRulesInputSchema,
  ListRegulatoryRulesOutputSchema,
  CreateRegulatoryRuleInputSchema,
  RegulatoryRuleOutputSchema,
  ListInspectionTemplatesInputSchema,
  ListInspectionTemplatesOutputSchema,
  CreateInspectionTemplateInputSchema,
  InspectionTemplateOutputSchema,
} from "./schema";

export const listAdministrativeUnitsContract = base
  .route({
    method: "GET",
    path: "/masters/administrative-units",
    summary: "List administrative units",
    description: "Lists States, Districts, Tehsils, and Villages in the hierarchy.",
    tags: ["Masters"],
  })
  .input(ListAdministrativeUnitsInputSchema)
  .output(ListAdministrativeUnitsOutputSchema);

export const createAdministrativeUnitContract = base
  .route({
    method: "POST",
    path: "/masters/administrative-units",
    successStatus: 201,
    summary: "Create administrative unit",
    description: "Adds a new node in the administrative unit hierarchy.",
    tags: ["Masters"],
  })
  .input(CreateAdministrativeUnitInputSchema)
  .output(AdministrativeUnitOutputSchema);

export const listInstrumentTypesContract = base
  .route({
    method: "GET",
    path: "/masters/instrument-types",
    summary: "List instrument types",
    description: "Lists master instrument categories and measurement kinds.",
    tags: ["Masters"],
  })
  .input(ListInstrumentTypesInputSchema)
  .output(ListInstrumentTypesOutputSchema);

export const createInstrumentTypeContract = base
  .route({
    method: "POST",
    path: "/masters/instrument-types",
    successStatus: 201,
    summary: "Create instrument type",
    description: "Defines a new controlled instrument type master record.",
    tags: ["Masters"],
  })
  .input(CreateInstrumentTypeInputSchema)
  .output(InstrumentTypeOutputSchema);

export const listRegulatoryRulesContract = base
  .route({
    method: "GET",
    path: "/masters/regulatory-rules",
    summary: "List regulatory rules",
    description: "Lists versioned tolerance and verification rules.",
    tags: ["Masters"],
  })
  .input(ListRegulatoryRulesInputSchema)
  .output(ListRegulatoryRulesOutputSchema);

export const createRegulatoryRuleContract = base
  .route({
    method: "POST",
    path: "/masters/regulatory-rules",
    successStatus: 201,
    summary: "Create regulatory rule",
    description: "Provisions a versioned tolerance rule with effective date bounds.",
    tags: ["Masters"],
  })
  .input(CreateRegulatoryRuleInputSchema)
  .output(RegulatoryRuleOutputSchema);

export const listInspectionTemplatesContract = base
  .route({
    method: "GET",
    path: "/masters/inspection-templates",
    summary: "List inspection templates",
    description: "Lists versioned inspection checklist and measurement schemas.",
    tags: ["Masters"],
  })
  .input(ListInspectionTemplatesInputSchema)
  .output(ListInspectionTemplatesOutputSchema);

export const createInspectionTemplateContract = base
  .route({
    method: "POST",
    path: "/masters/inspection-templates",
    successStatus: 201,
    summary: "Create inspection template",
    description: "Provisions a new category-specific inspection checklist template.",
    tags: ["Masters"],
  })
  .input(CreateInspectionTemplateInputSchema)
  .output(InspectionTemplateOutputSchema);

export const mastersContract = {
  listAdministrativeUnits: listAdministrativeUnitsContract,
  createAdministrativeUnit: createAdministrativeUnitContract,
  listInstrumentTypes: listInstrumentTypesContract,
  createInstrumentType: createInstrumentTypeContract,
  listRegulatoryRules: listRegulatoryRulesContract,
  createRegulatoryRule: createRegulatoryRuleContract,
  listInspectionTemplates: listInspectionTemplatesContract,
  createInspectionTemplate: createInspectionTemplateContract,
};
