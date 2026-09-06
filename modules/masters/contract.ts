import { base } from "@/contracts/base";
import {
  ListAdministrativeUnitsInputSchema,
  ListAdministrativeUnitsOutputSchema,
  CreateAdministrativeUnitInputSchema,
  AdministrativeUnitOutputSchema,
  UpdateAdministrativeUnitInputSchema,
  DeleteAdministrativeUnitInputSchema,
  DeletedOutputSchema,
  ListInstrumentTypesInputSchema,
  ListInstrumentTypesOutputSchema,
  CreateInstrumentTypeInputSchema,
  InstrumentTypeOutputSchema,
  UpdateInstrumentTypeInputSchema,
  DeleteInstrumentTypeInputSchema,
  ListRegulatoryRulesInputSchema,
  ListRegulatoryRulesOutputSchema,
  CreateRegulatoryRuleInputSchema,
  RegulatoryRuleOutputSchema,
  UpdateRegulatoryRuleInputSchema,
  DeleteRegulatoryRuleInputSchema,
  ListInspectionTemplatesInputSchema,
  ListInspectionTemplatesOutputSchema,
  CreateInspectionTemplateInputSchema,
  InspectionTemplateOutputSchema,
  UpdateInspectionTemplateInputSchema,
  DeleteInspectionTemplateInputSchema,
} from "./schema";

export const listAdministrativeUnitsContract = base
  .route({ method: "GET", path: "/masters/administrative-units", summary: "List administrative units", tags: ["Masters"] })
  .input(ListAdministrativeUnitsInputSchema)
  .output(ListAdministrativeUnitsOutputSchema);

export const createAdministrativeUnitContract = base
  .route({ method: "POST", path: "/masters/administrative-units", successStatus: 201, summary: "Create administrative unit", tags: ["Masters"] })
  .input(CreateAdministrativeUnitInputSchema)
  .output(AdministrativeUnitOutputSchema);

export const updateAdministrativeUnitContract = base
  .route({ method: "PUT", path: "/masters/administrative-units/{id}", summary: "Update administrative unit", tags: ["Masters"] })
  .input(UpdateAdministrativeUnitInputSchema)
  .output(AdministrativeUnitOutputSchema);

export const deleteAdministrativeUnitContract = base
  .route({ method: "DELETE", path: "/masters/administrative-units/{id}", summary: "Delete administrative unit", tags: ["Masters"] })
  .input(DeleteAdministrativeUnitInputSchema)
  .output(DeletedOutputSchema);

export const listInstrumentTypesContract = base
  .route({ method: "GET", path: "/masters/instrument-types", summary: "List instrument types", tags: ["Masters"] })
  .input(ListInstrumentTypesInputSchema)
  .output(ListInstrumentTypesOutputSchema);

export const createInstrumentTypeContract = base
  .route({ method: "POST", path: "/masters/instrument-types", successStatus: 201, summary: "Create instrument type", tags: ["Masters"] })
  .input(CreateInstrumentTypeInputSchema)
  .output(InstrumentTypeOutputSchema);

export const updateInstrumentTypeContract = base
  .route({ method: "PUT", path: "/masters/instrument-types/{id}", summary: "Update instrument type", tags: ["Masters"] })
  .input(UpdateInstrumentTypeInputSchema)
  .output(InstrumentTypeOutputSchema);

export const deleteInstrumentTypeContract = base
  .route({ method: "DELETE", path: "/masters/instrument-types/{id}", summary: "Delete instrument type", tags: ["Masters"] })
  .input(DeleteInstrumentTypeInputSchema)
  .output(DeletedOutputSchema);

export const listRegulatoryRulesContract = base
  .route({ method: "GET", path: "/masters/regulatory-rules", summary: "List regulatory rules", tags: ["Masters"] })
  .input(ListRegulatoryRulesInputSchema)
  .output(ListRegulatoryRulesOutputSchema);

export const createRegulatoryRuleContract = base
  .route({ method: "POST", path: "/masters/regulatory-rules", successStatus: 201, summary: "Create regulatory rule", tags: ["Masters"] })
  .input(CreateRegulatoryRuleInputSchema)
  .output(RegulatoryRuleOutputSchema);

export const updateRegulatoryRuleContract = base
  .route({ method: "PUT", path: "/masters/regulatory-rules/{id}", summary: "Update regulatory rule", tags: ["Masters"] })
  .input(UpdateRegulatoryRuleInputSchema)
  .output(RegulatoryRuleOutputSchema);

export const deleteRegulatoryRuleContract = base
  .route({ method: "DELETE", path: "/masters/regulatory-rules/{id}", summary: "Delete regulatory rule", tags: ["Masters"] })
  .input(DeleteRegulatoryRuleInputSchema)
  .output(DeletedOutputSchema);

export const listInspectionTemplatesContract = base
  .route({ method: "GET", path: "/masters/inspection-templates", summary: "List inspection templates", tags: ["Masters"] })
  .input(ListInspectionTemplatesInputSchema)
  .output(ListInspectionTemplatesOutputSchema);

export const createInspectionTemplateContract = base
  .route({ method: "POST", path: "/masters/inspection-templates", successStatus: 201, summary: "Create inspection template", tags: ["Masters"] })
  .input(CreateInspectionTemplateInputSchema)
  .output(InspectionTemplateOutputSchema);

export const updateInspectionTemplateContract = base
  .route({ method: "PUT", path: "/masters/inspection-templates/{id}", summary: "Update inspection template", tags: ["Masters"] })
  .input(UpdateInspectionTemplateInputSchema)
  .output(InspectionTemplateOutputSchema);

export const deleteInspectionTemplateContract = base
  .route({ method: "DELETE", path: "/masters/inspection-templates/{id}", summary: "Delete inspection template", tags: ["Masters"] })
  .input(DeleteInspectionTemplateInputSchema)
  .output(DeletedOutputSchema);

export const mastersContract = {
  listAdministrativeUnits: listAdministrativeUnitsContract,
  createAdministrativeUnit: createAdministrativeUnitContract,
  updateAdministrativeUnit: updateAdministrativeUnitContract,
  deleteAdministrativeUnit: deleteAdministrativeUnitContract,
  listInstrumentTypes: listInstrumentTypesContract,
  createInstrumentType: createInstrumentTypeContract,
  updateInstrumentType: updateInstrumentTypeContract,
  deleteInstrumentType: deleteInstrumentTypeContract,
  listRegulatoryRules: listRegulatoryRulesContract,
  createRegulatoryRule: createRegulatoryRuleContract,
  updateRegulatoryRule: updateRegulatoryRuleContract,
  deleteRegulatoryRule: deleteRegulatoryRuleContract,
  listInspectionTemplates: listInspectionTemplatesContract,
  createInspectionTemplate: createInspectionTemplateContract,
  updateInspectionTemplate: updateInspectionTemplateContract,
  deleteInspectionTemplate: deleteInspectionTemplateContract,
};
