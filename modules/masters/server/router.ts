import { implement } from "@orpc/server";
import { mastersContract } from "../contract";
import { mastersService } from "./service";

const implementer = implement(mastersContract);

export const mastersRouter = implementer.router({
  listAdministrativeUnits: implementer.listAdministrativeUnits.handler(async ({ input }) => {
    return mastersService.listAdministrativeUnits(input);
  }),
  createAdministrativeUnit: implementer.createAdministrativeUnit.handler(async ({ input }) => {
    return mastersService.createAdministrativeUnit(input);
  }),
  listInstrumentTypes: implementer.listInstrumentTypes.handler(async ({ input }) => {
    return mastersService.listInstrumentTypes(input);
  }),
  createInstrumentType: implementer.createInstrumentType.handler(async ({ input }) => {
    return mastersService.createInstrumentType(input);
  }),
  listRegulatoryRules: implementer.listRegulatoryRules.handler(async ({ input }) => {
    return mastersService.listRegulatoryRules(input);
  }),
  createRegulatoryRule: implementer.createRegulatoryRule.handler(async ({ input }) => {
    return mastersService.createRegulatoryRule(input);
  }),
  listInspectionTemplates: implementer.listInspectionTemplates.handler(async ({ input }) => {
    return mastersService.listInspectionTemplates(input);
  }),
  createInspectionTemplate: implementer.createInspectionTemplate.handler(async ({ input }) => {
    return mastersService.createInspectionTemplate(input);
  }),
});
