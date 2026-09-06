import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import {
  AdminUnitType,
  AdministrativeUnitOutput,
  CreateAdministrativeUnitInput,
  CreateInspectionTemplateInput,
  CreateInstrumentTypeInput,
  CreateRegulatoryRuleInput,
  DeletedOutput,
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
  UpdateAdministrativeUnitInput,
  UpdateInspectionTemplateInput,
  UpdateInstrumentTypeInput,
  UpdateRegulatoryRuleInput,
} from "../schema";
import { paginationMeta } from "@/schemas/shared";

function validation(path: string, message: string): never {
  throw new ORPCError("VALIDATION_ERROR", { data: { issues: [{ path, message }] } });
}

function conflict(field: string, message: string): never {
  throw new ORPCError("CONFLICT", { data: { field, message } });
}

function notFound(resourceType: string, resourceId: string): never {
  throw new ORPCError("NOT_FOUND", { data: { resourceType, resourceId } });
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

/** Refuse a delete while any named reference still points at the row. */
async function assertDeletable(refs: { label: string; check: () => Promise<unknown> }[]): Promise<void> {
  for (const { label, check } of refs) {
    if (await check()) conflict("id", `Cannot delete: still referenced by ${label}`);
  }
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
        notFound("AdministrativeUnit", input.parentId!);
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

  async updateAdministrativeUnit(input: UpdateAdministrativeUnitInput): Promise<AdministrativeUnitOutput> {
    const existing = await db.orm.public.AdministrativeUnit.first({ id: input.id });
    if (!existing) notFound("AdministrativeUnit", input.id);

    const name = input.name ?? existing.name;
    if (name !== existing.name) {
      const sibling = await db.orm.public.AdministrativeUnit.where({
        parentId: existing.parentId,
        type: existing.type,
        name,
      }).first();
      if (sibling) conflict("name", "A unit with this name already exists under the same parent");
    }

    await db.orm.public.AdministrativeUnit.where({ id: input.id }).update({
      name,
      latitude: input.latitude ?? existing.latitude,
      longitude: input.longitude ?? existing.longitude,
    });

    return (await db.orm.public.AdministrativeUnit.first({ id: input.id }))!;
  },

  async deleteAdministrativeUnit(input: { id: string }): Promise<DeletedOutput> {
    const existing = await db.orm.public.AdministrativeUnit.first({ id: input.id });
    if (!existing) notFound("AdministrativeUnit", input.id);

    await assertDeletable([
      { label: "child units", check: () => db.orm.public.AdministrativeUnit.where({ parentId: input.id }).first() },
      { label: "instruments", check: () => db.orm.public.Instrument.where({ administrativeUnitId: input.id }).first() },
      { label: "LMO bases", check: () => db.orm.public.Lmo.where({ baseAdministrativeUnitId: input.id }).first() },
      { label: "LMO jurisdictions", check: () => db.orm.public.LmoJurisdiction.where({ administrativeUnitId: input.id }).first() },
      { label: "GATC locations", check: () => db.orm.public.Gatc.where({ administrativeUnitId: input.id }).first() },
      { label: "GATC service areas", check: () => db.orm.public.GatcServiceArea.where({ administrativeUnitId: input.id }).first() },
      { label: "admin scopes", check: () => db.orm.public.AdminScope.where({ administrativeUnitId: input.id }).first() },
      { label: "location history", check: () => db.orm.public.InstrumentLocationHistory.where({ administrativeUnitId: input.id }).first() },
    ]);

    await db.orm.public.AdministrativeUnit.where({ id: input.id }).delete();
    return { id: input.id };
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

  async updateInstrumentType(input: UpdateInstrumentTypeInput): Promise<InstrumentTypeOutput> {
    const existing = await db.orm.public.InstrumentType.first({ id: input.id });
    if (!existing) notFound("InstrumentType", input.id);

    const code = input.code ?? existing.code;
    if (code !== existing.code) {
      const clash = await db.orm.public.InstrumentType.where({ code }).first();
      if (clash) conflict("code", "Instrument type code already exists");
    }

    await db.orm.public.InstrumentType.where({ id: input.id }).update({
      code,
      name: input.name ?? existing.name,
      unit: input.unit ?? existing.unit,
    });
    return (await db.orm.public.InstrumentType.first({ id: input.id }))!;
  },

  async deleteInstrumentType(input: { id: string }): Promise<DeletedOutput> {
    const existing = await db.orm.public.InstrumentType.first({ id: input.id });
    if (!existing) notFound("InstrumentType", input.id);

    await assertDeletable([
      { label: "instruments", check: () => db.orm.public.Instrument.where({ instrumentTypeId: input.id }).first() },
      { label: "LMO expertise", check: () => db.orm.public.LmoInstrumentType.where({ instrumentTypeId: input.id }).first() },
      { label: "GATC authorizations", check: () => db.orm.public.GatcAuthorization.where({ instrumentTypeId: input.id }).first() },
      { label: "regulatory rules", check: () => db.orm.public.RegulatoryRule.where({ instrumentTypeId: input.id }).first() },
      { label: "inspection templates", check: () => db.orm.public.InspectionTemplate.where({ instrumentTypeId: input.id }).first() },
    ]);

    await db.orm.public.InstrumentType.where({ id: input.id }).delete();
    return { id: input.id };
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
    if (await this.findRuleClash({ ...input, effectiveUntil: input.effectiveUntil ?? null })) {
      conflict("accuracyClass", "An active rule already covers this type, class, and capacity band");
    }

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

  async updateRegulatoryRule(input: UpdateRegulatoryRuleInput): Promise<RegulatoryRuleOutput> {
    const existing = await db.orm.public.RegulatoryRule.first({ id: input.id });
    if (!existing) notFound("RegulatoryRule", input.id);

    const next = {
      instrumentTypeId: existing.instrumentTypeId,
      accuracyClass: input.accuracyClass ?? existing.accuracyClass,
      capacityMin: input.capacityMin ?? existing.capacityMin,
      capacityMax: input.capacityMax ?? existing.capacityMax,
      permissibleError: input.permissibleError ?? existing.permissibleError,
      verificationPeriodMonths: input.verificationPeriodMonths ?? existing.verificationPeriodMonths,
      effectiveFrom: input.effectiveFrom ?? existing.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? existing.effectiveUntil,
    };

    if (num(next.capacityMin) > num(next.capacityMax)) {
      validation("capacityMin", "capacityMin must be <= capacityMax");
    }
    if (next.effectiveUntil && next.effectiveFrom >= next.effectiveUntil) {
      validation("effectiveUntil", "effectiveUntil must be after effectiveFrom");
    }
    if (await this.findRuleClash(next, input.id)) {
      conflict("accuracyClass", "An active rule already covers this type, class, and capacity band");
    }

    await db.orm.public.RegulatoryRule.where({ id: input.id }).update({
      accuracyClass: next.accuracyClass,
      capacityMin: next.capacityMin,
      capacityMax: next.capacityMax,
      permissibleError: next.permissibleError,
      verificationPeriodMonths: next.verificationPeriodMonths,
      effectiveFrom: next.effectiveFrom,
      effectiveUntil: next.effectiveUntil,
    });

    return (await db.orm.public.RegulatoryRule.first({ id: input.id }))!;
  },

  async deleteRegulatoryRule(input: { id: string }): Promise<DeletedOutput> {
    const existing = await db.orm.public.RegulatoryRule.first({ id: input.id });
    if (!existing) notFound("RegulatoryRule", input.id);

    await assertDeletable([
      { label: "inspections", check: () => db.orm.public.Inspection.where({ ruleVersionId: input.id }).first() },
      { label: "certificates", check: () => db.orm.public.Certificate.where({ ruleVersionId: input.id }).first() },
    ]);

    await db.orm.public.RegulatoryRule.where({ id: input.id }).delete();
    return { id: input.id };
  },

  async findRuleClash(
    input: {
      instrumentTypeId: string;
      accuracyClass: string;
      capacityMin: string;
      capacityMax: string;
      effectiveFrom: string;
      effectiveUntil: string | null;
    },
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await db.orm.public.RegulatoryRule.where({
      instrumentTypeId: input.instrumentTypeId,
      accuracyClass: input.accuracyClass,
    }).all();

    const newMin = num(input.capacityMin);
    const newMax = num(input.capacityMax);
    const newFrom = Date.parse(input.effectiveFrom);
    const newUntil = input.effectiveUntil ? Date.parse(input.effectiveUntil) : Infinity;

    return existing.some((r) => {
      if (r.id === excludeId) return false;
      const existingFrom = Date.parse(r.effectiveFrom);
      const existingUntil = r.effectiveUntil ? Date.parse(r.effectiveUntil) : Infinity;
      const capacityOverlaps = num(r.capacityMin) <= newMax && num(r.capacityMax) >= newMin;
      const windowOverlaps = existingFrom <= newUntil && newFrom <= existingUntil;
      return capacityOverlaps && windowOverlaps;
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

  async updateInspectionTemplate(input: UpdateInspectionTemplateInput): Promise<InspectionTemplateOutput> {
    const existing = await db.orm.public.InspectionTemplate.first({ id: input.id });
    if (!existing) notFound("InspectionTemplate", input.id);

    await db.orm.public.InspectionTemplate.where({ id: input.id }).update({
      name: input.name ?? existing.name,
      effectiveFrom: input.effectiveFrom ?? existing.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? existing.effectiveUntil,
      isActive: input.isActive ?? existing.isActive,
    });

    const updated = await db.orm.public.InspectionTemplate.first({ id: input.id });
    const items = await db.orm.public.InspectionTemplateItem.where({ templateId: input.id })
      .orderBy((i) => i.displayOrder.asc())
      .all();
    return { ...updated!, items };
  },

  async deleteInspectionTemplate(input: { id: string }): Promise<DeletedOutput> {
    const existing = await db.orm.public.InspectionTemplate.first({ id: input.id });
    if (!existing) notFound("InspectionTemplate", input.id);

    await assertDeletable([
      { label: "inspections", check: () => db.orm.public.Inspection.where({ templateId: input.id }).first() },
    ]);

    await db.orm.public.InspectionTemplate.where({ id: input.id }).delete();
    return { id: input.id };
  },
};
