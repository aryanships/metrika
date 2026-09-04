import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import {
  AdminUnitType,
  AdministrativeUnitOutput,
  CreateAdministrativeUnitInput,
  CreateInspectionTemplateInput,
  CreateInstrumentTypeInput,
  CreateRegulatoryRuleInput,
  InspectionTemplateOutput,
  InstrumentTypeOutput,
  ListAdministrativeUnitsInput,
  ListAdministrativeUnitsOutput,
  ListInspectionTemplatesInput,
  ListInspectionTemplatesOutput,
  ListInstrumentTypesInput,
  ListInstrumentTypesOutput,
  ListRegulatoryRulesInput,
  ListRegulatoryRulesOutput,
  RegulatoryRuleOutput,
} from "../schema";
import { paginationMeta } from "@/schemas/shared";

function validation(path: string, message: string): never {
  throw new ORPCError("VALIDATION_ERROR", { data: { issues: [{ path, message }] } });
}

function conflict(field: string, message: string): never {
  throw new ORPCError("CONFLICT", { data: { field, message } });
}

// Parent each level may point to; STATE has no parent. This also makes
// hierarchy cycles impossible by construction.
const PARENT_TYPE: Record<AdminUnitType, AdminUnitType | null> = {
  STATE: null,
  DISTRICT: "STATE",
  TEHSIL: "DISTRICT",
  VILLAGE: "TEHSIL",
};

function num(value: string): number {
  return Number(value);
}

export const mastersService = {
  // ------------------------------------------------------------- admin units
  async listAdministrativeUnits(input: ListAdministrativeUnitsInput): Promise<ListAdministrativeUnitsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    let query = db.orm.public.AdministrativeUnit;
    if (input.parentId) query = query.where({ parentId: input.parentId });
    if (input.type) query = query.where({ type: input.type });

    const [items, totals] = await Promise.all([
      query.orderBy((u) => u.name.asc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);
    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async createAdministrativeUnit(input: CreateAdministrativeUnitInput): Promise<AdministrativeUnitOutput> {
    const expectedParent = PARENT_TYPE[input.type];
    let parentId: string | null = null;

    if (expectedParent) {
      if (!input.parentId) {
        validation("parentId", `${input.type} requires a ${expectedParent} parent`);
      }
      const parent = await db.orm.public.AdministrativeUnit.first({ id: input.parentId! });
      if (!parent) {
        throw new ORPCError("NOT_FOUND", { data: { resourceType: "AdministrativeUnit", resourceId: input.parentId! } });
      }
      if (parent.type !== expectedParent) {
        validation("parentId", `${input.type} must be a child of ${expectedParent}, not ${parent.type}`);
      }
      parentId = parent.id;
    }

    return db.orm.public.AdministrativeUnit.create({
      name: input.name,
      type: input.type,
      parentId,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    });
  },

  // ----------------------------------------------------------- instrument types
  async listInstrumentTypes(input: ListInstrumentTypesInput): Promise<ListInstrumentTypesOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const [items, totals] = await Promise.all([
      db.orm.public.InstrumentType.orderBy((t) => t.name.asc()).offset((page - 1) * limit).limit(limit).all(),
      db.orm.public.InstrumentType.aggregate((agg) => ({ total: agg.count() })),
    ]);
    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async createInstrumentType(input: CreateInstrumentTypeInput): Promise<InstrumentTypeOutput> {
    const existing = await db.orm.public.InstrumentType.where({ code: input.code }).first();
    if (existing) conflict("code", "Instrument type code already exists");
    return db.orm.public.InstrumentType.create({ code: input.code, name: input.name, unit: input.unit });
  },

  // ---------------------------------------------------------- regulatory rules
  async listRegulatoryRules(input: ListRegulatoryRulesInput): Promise<ListRegulatoryRulesOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    let query = db.orm.public.RegulatoryRule;
    if (input.instrumentTypeId) query = query.where({ instrumentTypeId: input.instrumentTypeId });
    if (input.accuracyClass) query = query.where({ accuracyClass: input.accuracyClass });

    const [items, totals] = await Promise.all([
      query.orderBy((r) => r.effectiveFrom.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);
    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async createRegulatoryRule(input: CreateRegulatoryRuleInput): Promise<RegulatoryRuleOutput> {
    if (num(input.capacityMin) > num(input.capacityMax)) {
      validation("capacityMin", "capacityMin must be <= capacityMax");
    }
    if (input.effectiveUntil && input.effectiveFrom >= input.effectiveUntil) {
      validation("effectiveUntil", "effectiveUntil must be after effectiveFrom");
    }

    const overlapping = await db.orm.public.RegulatoryRule.where({
      instrumentTypeId: input.instrumentTypeId,
      accuracyClass: input.accuracyClass,
    }).all();

    const newMin = num(input.capacityMin);
    const newMax = num(input.capacityMax);
    const newUntil = input.effectiveUntil ? Date.parse(input.effectiveUntil) : Infinity;
    const newFrom = Date.parse(input.effectiveFrom);

    const clash = overlapping.some((r) => {
      const existingUntil = r.effectiveUntil ? Date.parse(r.effectiveUntil) : Infinity;
      const existingFrom = Date.parse(r.effectiveFrom);
      const capacityOverlaps = num(r.capacityMin) <= newMax && num(r.capacityMax) >= newMin;
      const windowOverlaps = existingFrom <= newUntil && newFrom <= existingUntil;
      return capacityOverlaps && windowOverlaps;
    });

    if (clash) conflict("accuracyClass", "An active rule already covers this type, class, and capacity band");

    return db.orm.public.RegulatoryRule.create({
      instrumentTypeId: input.instrumentTypeId,
      accuracyClass: input.accuracyClass,
      capacityMin: input.capacityMin,
      capacityMax: input.capacityMax,
      permissibleError: input.permissibleError,
      verificationPeriodMonths: input.verificationPeriodMonths,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? null,
    });
  },

  // -------------------------------------------------------- inspection templates
  async listInspectionTemplates(input: ListInspectionTemplatesInput): Promise<ListInspectionTemplatesOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    let query = db.orm.public.InspectionTemplate;
    if (input.instrumentTypeId) query = query.where({ instrumentTypeId: input.instrumentTypeId });

    const [templates, totals] = await Promise.all([
      query.orderBy((t) => t.version.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    const items = await Promise.all(
      templates.map(async (t) => ({
        ...t,
        items: await db.orm.public.InspectionTemplateItem.where({ templateId: t.id })
          .orderBy((i) => i.displayOrder.asc())
          .all(),
      })),
    );

    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async createInspectionTemplate(input: CreateInspectionTemplateInput): Promise<InspectionTemplateOutput> {
    const highest = await db.orm.public.InspectionTemplate.where({
      instrumentTypeId: input.instrumentTypeId,
      code: input.code,
    })
      .orderBy((t) => t.version.desc())
      .first();

    const template = await db.orm.public.InspectionTemplate.create({
      instrumentTypeId: input.instrumentTypeId,
      code: input.code,
      name: input.name,
      version: (highest?.version ?? 0) + 1,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? null,
      isActive: true,
    });

    const items = [];
    for (const item of input.items) {
      items.push(
        await db.orm.public.InspectionTemplateItem.create({
          templateId: template.id,
          code: item.code,
          label: item.label,
          kind: item.kind,
          unit: item.unit ?? null,
          isRequired: item.isRequired,
          displayOrder: item.displayOrder,
        }),
      );
    }

    return { ...template, items };
  },
};
