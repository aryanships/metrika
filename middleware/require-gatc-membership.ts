import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import type { AppUser } from "./context";

export async function requireGatcMembership(user: AppUser, gatcId: string): Promise<void> {
  const membership = await db.orm.public.GatcMembership.where({ userId: user.id, gatcId }).first();
  if (!membership || !membership.isActive) {
    throw new ORPCError("FORBIDDEN", { data: { reason: "Not an active member of this GATC" } });
  }
}
