import { mastersRepository } from "./repository";
import {
  ListAdministrativeUnitsInput,
  ListAdministrativeUnitsOutput,
  CreateAdministrativeUnitInput,
  AdministrativeUnitOutput,
  ListInstrumentTypesInput,
  ListInstrumentTypesOutput,
  CreateInstrumentTypeInput,
  InstrumentTypeOutput,
  ListRegulatoryRulesInput,
  ListRegulatoryRulesOutput,
  CreateRegulatoryRuleInput,
  RegulatoryRuleOutput,
  ListInspectionTemplatesInput,
  ListInspectionTemplatesOutput,
  CreateInspectionTemplateInput,
  InspectionTemplateOutput,
} from "../schema";

export const mastersService = {
  async listAdministrativeUnits(
    input: ListAdministrativeUnitsInput
  ): Promise<ListAdministrativeUnitsOutput> {
    return {
      items: [
        {
          id: "unit_demo_state",
          code: "DL",
          name: "Delhi",
          type: "STATE",
          parentId: null,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async createAdministrativeUnit(
    input: CreateAdministrativeUnitInput
  ): Promise<AdministrativeUnitOutput> {
    const created = await mastersRepository.createAdministrativeUnit({
      code: input.code,
      name: input.name,
      type: input.type,
      parentId: input.parentId ?? null,
      active: true,
    });
    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async listInstrumentTypes(input: ListInstrumentTypesInput): Promise<ListInstrumentTypesOutput> {
    return {
      items: [
        {
          id: "it_weighing_scale",
          code: "NAWI",
          name: "Non-Automatic Weighing Instrument",
          category: "MASS",
          active: true,
          description: "Standard electronic retail & industrial weighing instruments",
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async createInstrumentType(input: CreateInstrumentTypeInput): Promise<InstrumentTypeOutput> {
    const created = await mastersRepository.createInstrumentType({
      code: input.code,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      active: true,
    });
    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async listRegulatoryRules(input: ListRegulatoryRulesInput): Promise<ListRegulatoryRulesOutput> {
    return {
      items: [
        {
          id: "rule_nawi_class3",
          instrumentTypeId: "it_weighing_scale",
          accuracyClass: "Class III",
          capacityMin: 0,
          capacityMax: 50,
          verificationPeriodMonths: 12,
          permissibleError: 0.001,
          effectiveFrom: new Date("2024-01-01").toISOString(),
          effectiveTo: null,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async createRegulatoryRule(input: CreateRegulatoryRuleInput): Promise<RegulatoryRuleOutput> {
    const created = await mastersRepository.createRegulatoryRule({
      instrumentTypeId: input.instrumentTypeId,
      accuracyClass: input.accuracyClass,
      capacityMin: input.capacityMin,
      capacityMax: input.capacityMax,
      verificationPeriodMonths: input.verificationPeriodMonths,
      permissibleError: input.permissibleError,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      active: true,
    });
    return {
      ...created,
      effectiveFrom: created.effectiveFrom.toISOString(),
      effectiveTo: created.effectiveTo ? created.effectiveTo.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async listInspectionTemplates(
    input: ListInspectionTemplatesInput
  ): Promise<ListInspectionTemplatesOutput> {
    return {
      items: [
        {
          id: "tmpl_nawi_v1",
          instrumentTypeId: "it_weighing_scale",
          version: 1,
          title: "Standard Verification Template for NAWI",
          description: "Default visual and tolerance inspection template",
          schemaJson: "{}",
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async createInspectionTemplate(
    input: CreateInspectionTemplateInput
  ): Promise<InspectionTemplateOutput> {
    const created = await mastersRepository.createInspectionTemplate({
      instrumentTypeId: input.instrumentTypeId,
      version: 1,
      title: input.title,
      description: input.description ?? null,
      schemaJson: input.schemaJson,
      active: true,
    });
    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
    };
  },
};
