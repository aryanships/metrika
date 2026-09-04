import { implement } from "@orpc/server";
import { mastersContract } from "../contract";
import { mastersService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import { requireRole } from "@/middleware/require-role";
import { auditAction } from "@/lib/audit";
import type { AppContext } from "@/middleware/context";

const implementer = implement(mastersContract).$context<AppContext>();

export const mastersRouter = implementer.router({
  listAdministrativeUnits: implementer.listAdministrativeUnits.use(requireAuth).handler(async ({ input }) => {
    return mastersService.listAdministrativeUnits(input);
  }),

  createAdministrativeUnit: implementer.createAdministrativeUnit.use(requireRole("SYSTEM_ADMIN")).handler(
    async ({ input, context }) => {
      const created = await mastersService.createAdministrativeUnit(input);
      await auditAction(context, "ADMIN_UNIT_CREATED", "AdministrativeUnit", created.id, created);
      return created;
    },
  ),

  listInstrumentTypes: implementer.listInstrumentTypes.use(requireAuth).handler(async ({ input }) => {
    return mastersService.listInstrumentTypes(input);
  }),

  createInstrumentType: implementer.createInstrumentType.use(requireRole("SYSTEM_ADMIN")).handler(
    async ({ input, context }) => {
      const created = await mastersService.createInstrumentType(input);
      await auditAction(context, "INSTRUMENT_TYPE_CREATED", "InstrumentType", created.id, created);
      return created;
    },
  ),

  listRegulatoryRules: implementer.listRegulatoryRules.use(requireAuth).handler(async ({ input }) => {
    return mastersService.listRegulatoryRules(input);
  }),

  createRegulatoryRule: implementer.createRegulatoryRule.use(requireRole("SYSTEM_ADMIN")).handler(
    async ({ input, context }) => {
      const created = await mastersService.createRegulatoryRule(input);
      await auditAction(context, "REGULATORY_RULE_CREATED", "RegulatoryRule", created.id, created);
      return created;
    },
  ),

  listInspectionTemplates: implementer.listInspectionTemplates.use(requireAuth).handler(async ({ input }) => {
    return mastersService.listInspectionTemplates(input);
  }),

  createInspectionTemplate: implementer.createInspectionTemplate.use(requireRole("SYSTEM_ADMIN")).handler(
    async ({ input, context }) => {
      const created = await mastersService.createInspectionTemplate(input);
      await auditAction(context, "INSPECTION_TEMPLATE_CREATED", "InspectionTemplate", created.id, created);
      return created;
    },
  ),
});
