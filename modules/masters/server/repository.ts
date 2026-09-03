/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `masters` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/masters/server/service.ts` or procedures.
 */

export interface AdministrativeUnitRecord {
  id: string;
  code: string;
  name: string;
  type: "STATE" | "DISTRICT" | "TEHSIL" | "VILLAGE";
  parentId?: string | null;
  active: boolean;
  createdAt: Date;
}

export interface InstrumentTypeRecord {
  id: string;
  code: string;
  name: string;
  category: string;
  active: boolean;
  description?: string | null;
  createdAt: Date;
}

export interface RegulatoryRuleRecord {
  id: string;
  instrumentTypeId: string;
  accuracyClass: string;
  capacityMin: number;
  capacityMax: number;
  verificationPeriodMonths: number;
  permissibleError: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  active: boolean;
  createdAt: Date;
}

export interface InspectionTemplateRecord {
  id: string;
  instrumentTypeId: string;
  version: number;
  title: string;
  description?: string | null;
  schemaJson: string;
  active: boolean;
  createdAt: Date;
}

export const mastersRepository = {
  async listAdministrativeUnits() {
    return [];
  },

  async findAdministrativeUnitById(id: string) {
    return null;
  },

  async createAdministrativeUnit(data: Omit<AdministrativeUnitRecord, "id" | "createdAt">) {
    return {
      id: `adm_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },

  async listInstrumentTypes() {
    return [];
  },

  async findInstrumentTypeById(id: string) {
    return null;
  },

  async createInstrumentType(data: Omit<InstrumentTypeRecord, "id" | "createdAt">) {
    return {
      id: `it_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },

  async listRegulatoryRules() {
    return [];
  },

  async createRegulatoryRule(data: Omit<RegulatoryRuleRecord, "id" | "createdAt">) {
    return {
      id: `rule_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },

  async listInspectionTemplates() {
    return [];
  },

  async createInspectionTemplate(data: Omit<InspectionTemplateRecord, "id" | "createdAt">) {
    return {
      id: `tmpl_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },
};
