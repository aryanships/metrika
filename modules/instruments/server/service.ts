import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { paginationMeta } from "@/schemas/shared";
import { adminInstrumentIds } from "@/lib/scope";
import { unitPathNames, type UnitPath } from "@/lib/geo";
import type { AppUser } from "@/middleware/context";
import {
  CreateInstrumentInput,
  GetInstrumentInput,
  IdentifyInstrumentInput,
  IdentifyInstrumentOutput,
  InstrumentOutput,
  InstrumentPassportOutput,
  ListInstrumentsInput,
  ListInstrumentsOutput,
  UpdateInstrumentInput,
} from "../schema";

type Orm = typeof db.orm.public;

function notFound(resourceId: string): never {
  throw new ORPCError("NOT_FOUND", { data: { resourceType: "Instrument", resourceId } });
}

function conflict(field: string, message: string): never {
  throw new ORPCError("CONFLICT", { data: { field, message } });
}

function validation(path: string, message: string): never {
  throw new ORPCError("VALIDATION_ERROR", { data: { issues: [{ path, message }] } });
}

// ponytail: random suffix + uniqueness check is enough for the demo; a DB
// sequence would only be needed at registration rates that don't apply here.
function generateInstrumentCode(): string {
  const year = new Date().getFullYear();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `DMI-${year}-${suffix}`;
}

async function nextInstrumentCode(orm: Orm): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInstrumentCode();
    const existing = await orm.Instrument.where({ instrumentCode: code }).first();
    if (!existing) return code;
  }
  throw conflict("instrumentCode", "Unable to allocate a unique instrument code");
}

type InstrumentRow = Awaited<ReturnType<Orm["Instrument"]["first"]>>;

function toOutput(
  row: NonNullable<InstrumentRow>,
  type: { name: string; unit: string } | null,
  unit: { name: string } | null,
  path?: UnitPath,
): InstrumentOutput {
  return {
    id: row.id,
    instrumentCode: row.instrumentCode,
    instrumentTypeId: row.instrumentTypeId,
    instrumentTypeName: type?.name ?? "",
    instrumentTypeUnit: type?.unit ?? "",
    businessId: row.businessId,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serialNumber,
    yearOfManufacture: row.yearOfManufacture,
    purchaseDate: row.purchaseDate,
    capacity: row.capacity,
    accuracyClass: row.accuracyClass,
    status: row.status,
    address: row.address,
    administrativeUnitId: row.administrativeUnitId,
    administrativeUnitName: unit?.name ?? "",
    stateName: path?.state ?? null,
    districtName: path?.district ?? null,
    tehsilName: path?.tehsil ?? null,
    villageName: path?.village ?? null,
    postalCode: row.postalCode,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function toEnrichedOutput(orm: Orm, row: NonNullable<InstrumentRow>): Promise<InstrumentOutput> {
  const [type, unit, path] = await Promise.all([
    orm.InstrumentType.first({ id: row.instrumentTypeId }),
    orm.AdministrativeUnit.first({ id: row.administrativeUnitId }),
    unitPathNames(row.administrativeUnitId),
  ]);
  return toOutput(row, type, unit, path);
}

export const instrumentsService = {
  async list(input: ListInstrumentsInput, businessId: string | null): Promise<ListInstrumentsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    if (!businessId) {
      return { items: [], pagination: paginationMeta(0, page, limit) };
    }

    let query = db.orm.public.Instrument.where({ businessId });
    if (input.status) query = query.where({ status: input.status });

    const [rows, totals] = await Promise.all([
      query.orderBy((i) => i.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    const typeIds = [...new Set(rows.map((r) => r.instrumentTypeId))];
    const unitIds = [...new Set(rows.map((r) => r.administrativeUnitId))];
    const [types, units] = await Promise.all([
      db.orm.public.InstrumentType.where((t) => t.id.in(typeIds)).all(),
      db.orm.public.AdministrativeUnit.where((u) => u.id.in(unitIds)).all(),
    ]);
    const typeById = new Map(types.map((t) => [t.id, t]));
    const unitById = new Map(units.map((u) => [u.id, u]));

    const items = rows.map((row) => toOutput(row, typeById.get(row.instrumentTypeId) ?? null, unitById.get(row.administrativeUnitId) ?? null));

    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async listForAdmin(input: ListInstrumentsInput, user: AppUser): Promise<ListInstrumentsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const instrumentIds = await adminInstrumentIds(user);
    if (instrumentIds !== null && instrumentIds.size === 0) {
      return { items: [], pagination: paginationMeta(0, page, limit) };
    }

    let query = db.orm.public.Instrument;
    if (instrumentIds !== null) query = query.where((i) => i.id.in([...instrumentIds]));
    if (input.status) query = query.where({ status: input.status });

    const [rows, totals] = await Promise.all([
      query.orderBy((i) => i.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    const typeIds = [...new Set(rows.map((r) => r.instrumentTypeId))];
    const unitIds = [...new Set(rows.map((r) => r.administrativeUnitId))];
    const [types, units] = await Promise.all([
      db.orm.public.InstrumentType.where((t) => t.id.in(typeIds)).all(),
      db.orm.public.AdministrativeUnit.where((u) => u.id.in(unitIds)).all(),
    ]);
    const typeById = new Map(types.map((t) => [t.id, t]));
    const unitById = new Map(units.map((u) => [u.id, u]));

    const items = rows.map((row) => toOutput(row, typeById.get(row.instrumentTypeId) ?? null, unitById.get(row.administrativeUnitId) ?? null));

    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async get(input: GetInstrumentInput): Promise<InstrumentOutput> {
    const row = await db.orm.public.Instrument.first({ id: input.id });
    if (!row) notFound(input.id);
    return toEnrichedOutput(db.orm.public, row);
  },

  async identify(input: IdentifyInstrumentInput): Promise<IdentifyInstrumentOutput> {
    const row = await db.orm.public.Instrument.where({ instrumentCode: input.code }).first();
    if (!row) notFound(input.code);

    const [type, latestApplication] = await Promise.all([
      db.orm.public.InstrumentType.first({ id: row.instrumentTypeId }),
      db.orm.public.Application.where({ instrumentId: row.id }).orderBy((a) => a.createdAt.desc()).first(),
    ]);

    return {
      id: row.id,
      instrumentCode: row.instrumentCode,
      serialNumber: row.serialNumber,
      status: row.status,
      instrumentTypeName: type?.name ?? "",
      latestApplicationId: latestApplication?.id ?? null,
    };
  },

  async create(input: CreateInstrumentInput, businessId: string | null): Promise<InstrumentOutput> {
    if (!businessId) validation("businessId", "Create a business profile before registering instruments");

    const [type, unit] = await Promise.all([
      db.orm.public.InstrumentType.first({ id: input.instrumentTypeId }),
      db.orm.public.AdministrativeUnit.first({ id: input.administrativeUnitId }),
    ]);
    if (!type) notFound(input.instrumentTypeId);
    if (!unit) notFound(input.administrativeUnitId);

    const duplicate = await db.orm.public.Instrument.where({
      instrumentTypeId: input.instrumentTypeId,
      manufacturer: input.manufacturer,
      serialNumber: input.serialNumber,
    }).first();
    if (duplicate) {
      conflict("serialNumber", "An instrument of this type with this manufacturer and serial number is already registered");
    }

    const instrumentCode = await nextInstrumentCode(db.orm.public);

    const row = await db.orm.public.Instrument.create({
      instrumentCode,
      instrumentTypeId: input.instrumentTypeId,
      businessId,
      manufacturer: input.manufacturer,
      model: input.model,
      serialNumber: input.serialNumber,
      yearOfManufacture: input.yearOfManufacture ?? null,
      purchaseDate: input.purchaseDate ?? null,
      capacity: input.capacity,
      accuracyClass: input.accuracyClass,
      status: "REGISTERED",
      address: input.address,
      administrativeUnitId: input.administrativeUnitId,
      postalCode: input.postalCode ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    });

    return toOutput(row, type, unit);
  },

  async update(input: UpdateInstrumentInput): Promise<InstrumentOutput> {
    const row = await db.orm.public.Instrument.first({ id: input.id });
    if (!row) notFound(input.id);

    await db.orm.public.Instrument.where({ id: input.id }).update({
      capacity: input.capacity,
      accuracyClass: input.accuracyClass,
      yearOfManufacture: input.yearOfManufacture,
      purchaseDate: input.purchaseDate,
    });

    return this.get({ id: input.id });
  },

  async passport(input: GetInstrumentInput): Promise<InstrumentPassportOutput> {
    const row = await db.orm.public.Instrument.first({ id: input.id });
    if (!row) notFound(input.id);

    const [instrument, certificates, applications] = await Promise.all([
      toEnrichedOutput(db.orm.public, row),
      db.orm.public.Certificate.where({ instrumentId: input.id })
        .orderBy((c) => c.verifiedAt.desc())
        .all(),
      db.orm.public.Application.where({ instrumentId: input.id })
        .orderBy((a) => a.createdAt.desc())
        .all(),
    ]);

    const certificateSummary = (c: (typeof certificates)[number]) => ({
      id: c.id,
      certificateCode: c.certificateCode,
      verifiedAt: c.verifiedAt,
      validUntil: c.validUntil,
      status: c.status,
    });

    return {
      instrument,
      activeCertificate: certificates[0] ? certificateSummary(certificates[0]) : null,
      certificates: certificates.map(certificateSummary),
      applications: applications.map((a) => ({
        id: a.id,
        applicationCode: a.applicationCode,
        type: a.type,
        status: a.status,
        submittedAt: a.submittedAt,
        createdAt: a.createdAt,
      })),
      applicationsCount: applications.length,
      certificatesCount: certificates.length,
    };
  },
};
