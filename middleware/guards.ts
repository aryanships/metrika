import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import type { AppUser } from "./context";

async function assertOwnedByBusiness(user: AppUser, businessId: string): Promise<void> {
  if (!user.businessId || user.businessId !== businessId) {
    throw new ORPCError("FORBIDDEN", { data: { reason: "Resource does not belong to your business" } });
  }
}

export async function requireInstrumentOwnership(user: AppUser, instrumentId: string): Promise<void> {
  const instrument = await db.orm.public.Instrument.first({ id: instrumentId });
  if (!instrument) {
    throw new ORPCError("NOT_FOUND", { data: { resourceType: "Instrument", resourceId: instrumentId } });
  }
  await assertOwnedByBusiness(user, instrument.businessId);
}

export async function requireApplicationOwnership(user: AppUser, applicationId: string): Promise<void> {
  const application = await db.orm.public.Application.first({ id: applicationId });
  if (!application) {
    throw new ORPCError("NOT_FOUND", { data: { resourceType: "Application", resourceId: applicationId } });
  }
  const instrument = await db.orm.public.Instrument.first({ id: application.instrumentId });
  if (!instrument) {
    throw new ORPCError("NOT_FOUND", { data: { resourceType: "Instrument", resourceId: application.instrumentId } });
  }
  await assertOwnedByBusiness(user, instrument.businessId);
}

export async function requireLmoAssignment(user: AppUser, lmoId: string): Promise<void> {
  const lmo = await db.orm.public.Lmo.first({ id: lmoId });
  if (!lmo || lmo.userId !== user.id || !lmo.isActive) {
    throw new ORPCError("FORBIDDEN", { data: { reason: "Not assigned as this LMO" } });
  }
}
