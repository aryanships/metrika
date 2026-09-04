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
  .route({ method: "GET", path: "/masters/administrative-units", summary: "List administrative units", tags: ["Masters"] })
  .input(ListAdministrativeUnitsInputSchema)
  .output(ListAdministrativeUnitsOutputSchema);

export const createAdministrativeUnitContract = base
  .route({ method: "POST", path: "/masters/administrative-units", successStatus: 201, summary: "Create administrative unit", tags: ["Masters"] })
  .input(CreateAdministrativeUnitInputSchema)
  .output(AdministrativeUnitOutputSchema);

export const listInstrumentTypesContract = base
  .route({ method: "GET", path: "/masters/instrument-types", summary: "List instrument types", tags: ["Masters"] })
  .input(ListInstrumentTypesInputSchema)
  .output(ListInstrumentTypesOutputSchema);

export const createInstrumentTypeContract = base
  .route({ method: "POST", path: "/masters/instrument-types", successStatus: 201, summary: "Create instrument type", tags: ["Masters"] })
  .input(CreateInstrumentTypeInputSchema)
  .output(InstrumentTypeOutputSchema);

export const listRegulatoryRulesContract = base
  .route({ method: "GET", path: "/masters/regulatory-rules", summary: "List regulatory rules", tags: ["Masters"] })
  .input(ListRegulatoryRulesInputSchema)
  .output(ListRegulatoryRulesOutputSchema);

export const createRegulatoryRuleContract = base
  .route({ method: "POST", path: "/masters/regulatory-rules", successStatus: 201, summary: "Create regulatory rule", tags: ["Masters"] })
  .input(CreateRegulatoryRuleInputSchema)
  .output(RegulatoryRuleOutputSchema);

export const listInspectionTemplatesContract = base
  .route({ method: "GET", path: "/masters/inspection-templates", summary: "List inspection templates", tags: ["Masters"] })
  .input(ListInspectionTemplatesInputSchema)
  .output(ListInspectionTemplatesOutputSchema);

export const createInspectionTemplateContract = base
  .route({ method: "POST", path: "/masters/inspection-templates", successStatus: 201, summary: "Create inspection template", tags: ["Masters"] })
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
