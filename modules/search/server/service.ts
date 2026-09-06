import { db } from "@/prisma/db";
import { visibleBusinessIds, visibleInstrumentIds } from "@/lib/scope";
import type { AppUser } from "@/middleware/context";
import type { SearchInput, SearchOutput } from "../schema";

// ponytail: dataset is small; fetch the visible slice and filter in JS rather
// than fight per-dialect string-matching APIs.
function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

export const searchService = {
  async global(input: SearchInput, user: AppUser): Promise<SearchOutput> {
    const query = input.query.trim().toLowerCase();
    const [instrumentIds, businessIds] = await Promise.all([
      visibleInstrumentIds(user),
      visibleBusinessIds(user),
    ]);

    const result: SearchOutput = {
      query: input.query,
      instruments: [],
      certificates: [],
      applications: [],
      businesses: [],
    };

    let instrumentQuery = db.orm.public.Instrument;
    if (instrumentIds !== null) instrumentQuery = instrumentQuery.where((i) => i.id.in([...instrumentIds]));
    const instruments = await instrumentQuery
      .select("id", "instrumentCode", "serialNumber", "instrumentTypeId", "businessId", "status")
      .all();

    if (instruments.length > 0) {
      const typeIds = [...new Set(instruments.map((i) => i.instrumentTypeId))];
      const bizIds = [...new Set(instruments.map((i) => i.businessId))];
      const [types, businesses] = await Promise.all([
        db.orm.public.InstrumentType.where((t) => t.id.in(typeIds)).all(),
        db.orm.public.Business.where((b) => b.id.in(bizIds)).all(),
      ]);
      const typeById = new Map(types.map((t) => [t.id, t.name]));
      const businessById = new Map(businesses.map((b) => [b.id, b.businessName]));

      result.instruments = instruments
        .filter((i) => matches(i.instrumentCode, query) || matches(i.serialNumber, query))
        .map((i) => ({
          id: i.id,
          instrumentCode: i.instrumentCode,
          serialNumber: i.serialNumber,
          instrumentTypeName: typeById.get(i.instrumentTypeId) ?? "",
          businessName: businessById.get(i.businessId) ?? "",
          status: i.status,
        }));

      const instrumentCodeById = new Map(instruments.map((i) => [i.id, i.instrumentCode]));
      const instrumentBusinessById = new Map(instruments.map((i) => [i.id, i.businessId]));

      let certificateQuery = db.orm.public.Certificate;
      if (instrumentIds !== null) certificateQuery = certificateQuery.where((c) => c.instrumentId.in([...instrumentIds]));
      const certificates = await certificateQuery.select("id", "certificateCode", "instrumentId", "status", "validUntil").all();
      result.certificates = certificates
        .filter((c) => matches(c.certificateCode, query))
        .map((c) => ({
          id: c.id,
          certificateCode: c.certificateCode,
          instrumentCode: instrumentCodeById.get(c.instrumentId) ?? "",
          businessName: businessById.get(instrumentBusinessById.get(c.instrumentId) ?? "") ?? "",
          status: c.status,
          validUntil: c.validUntil,
        }));

      let applicationQuery = db.orm.public.Application;
      if (instrumentIds !== null) applicationQuery = applicationQuery.where((a) => a.instrumentId.in([...instrumentIds]));
      const applications = await applicationQuery.select("id", "applicationCode", "instrumentId", "type", "status").all();
      result.applications = applications
        .filter((a) => matches(a.applicationCode, query))
        .map((a) => ({
          id: a.id,
          applicationCode: a.applicationCode,
          instrumentCode: instrumentCodeById.get(a.instrumentId) ?? "",
          type: a.type,
          status: a.status,
        }));
    }

    let businessQuery = db.orm.public.Business;
    if (businessIds !== null) businessQuery = businessQuery.where((b) => b.id.in([...businessIds]));
    const businesses = await businessQuery.select("id", "businessName", "registrationNumber", "contactPhone").all();
    result.businesses = businesses
      .filter((b) => matches(b.businessName, query) || matches(b.registrationNumber ?? "", query))
      .map((b) => ({
        id: b.id,
        businessName: b.businessName,
        registrationNumber: b.registrationNumber,
        contactPhone: b.contactPhone,
      }));

    return result;
  },
};
