import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../../prisma/db";
import { applicationsService } from "../../modules/applications/server/service";
import { searchService } from "../../modules/search/server/service";
import type { AppUser } from "../../middleware/context";

const orm = db.orm.public;

async function loadUser(email: string, roles: AppUser["roles"], businessId: string | null = null): Promise<AppUser> {
  const user = await orm.User.where({ email }).first();
  if (!user) throw new Error(`Missing seed user: ${email}`);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles,
    phone: user.phone,
    businessId,
    isActive: user.isActive,
  };
}

async function rejectsWithCode(promise: Promise<unknown>, code: string): Promise<void> {
  let threw = false;
  try {
    await promise;
  } catch (err) {
    threw = true;
    expect((err as { code?: string }).code).toBe(code);
  }
  expect(threw).toBe(true);
}

let reliance: AppUser;
let bpcl: AppUser;
let puneAdmin: AppUser;

beforeAll(async () => {
  const relianceBusiness = await orm.Business.where({ userId: (await orm.User.where({ email: "owner.reliance@retail.in" }).first())!.id }).first();
  const bpclBusiness = await orm.Business.where({ userId: (await orm.User.where({ email: "owner.bpcl@petro.in" }).first())!.id }).first();
  reliance = await loadUser("owner.reliance@retail.in", ["INSTRUMENT_OWNER"], relianceBusiness!.id);
  bpcl = await loadUser("owner.bpcl@petro.in", ["INSTRUMENT_OWNER"], bpclBusiness!.id);
  puneAdmin = await loadUser("distadmin.pune@metrika.gov.in", ["DISTRICT_ADMIN"]);
});

afterAll(async () => {
  await db.close();
});

describe("RBAC / IDOR", () => {
  test("an owner cannot view another business's application", async () => {
    const bpclInstrumentIds = await orm.Instrument.where({ businessId: bpcl.businessId! }).select("id").all();
    const bpclApplication = await orm.Application.where((a) => a.instrumentId.in(bpclInstrumentIds.map((i) => i.id))).first();
    await rejectsWithCode(applicationsService.detail({ id: bpclApplication!.id }, reliance), "FORBIDDEN");
  });

  test("an owner can view their own application", async () => {
    const relianceInstrumentIds = await orm.Instrument.where({ businessId: reliance.businessId! }).select("id").all();
    const relianceApplication = await orm.Application.where((a) => a.instrumentId.in(relianceInstrumentIds.map((i) => i.id))).first();
    const detail = await applicationsService.detail({ id: relianceApplication!.id }, reliance);
    expect(detail.application.id).toBe(relianceApplication!.id);
  });

  test("a district admin cannot view an out-of-scope application", async () => {
    const mumbaiInstrument = await orm.Instrument.where({ instrumentCode: "DMI-EWB-012" }).first();
    const mumbaiApplication = await orm.Application.where({ instrumentId: mumbaiInstrument!.id }).first();
    await rejectsWithCode(applicationsService.detail({ id: mumbaiApplication!.id }, puneAdmin), "FORBIDDEN");
  });

  test("search.global is permission-scoped for owners", async () => {
    const result = await searchService.global({ query: "DMI-EWB" }, reliance);
    expect(result.instruments.length).toBeGreaterThan(0);
    for (const instrument of result.instruments) {
      expect(instrument.instrumentCode).toMatch(/^DMI-EWB-00[1-4]$/);
    }
    // The other businesses' EWB instruments must not leak through.
    const codes = result.instruments.map((i) => i.instrumentCode);
    expect(codes).not.toContain("DMI-EWB-011");
    expect(codes).not.toContain("DMI-EWB-017");
  });

  test("search.global returns nothing for an unrelated query", async () => {
    const result = await searchService.global({ query: "ZZZ-NO-MATCH" }, reliance);
    expect(result.instruments).toEqual([]);
    expect(result.certificates).toEqual([]);
    expect(result.applications).toEqual([]);
  });
});
