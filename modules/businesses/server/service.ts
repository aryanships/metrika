import { db } from "@/prisma/db";
import { BusinessOutput, SaveBusinessInput } from "../schema";

export const businessesService = {
  async get(userId: string): Promise<BusinessOutput | null> {
    return db.orm.public.Business.where({ userId }).first();
  },

  async save(userId: string, input: SaveBusinessInput): Promise<BusinessOutput> {
    const existing = await db.orm.public.Business.where({ userId }).first();

    if (existing) {
      await db.orm.public.Business.where({ id: existing.id }).update({
        businessName: input.businessName,
        registrationNumber: input.registrationNumber ?? null,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
      });
      const updated = await db.orm.public.Business.first({ id: existing.id });
      return updated!;
    }

    return db.orm.public.Business.create({
      userId,
      businessName: input.businessName,
      registrationNumber: input.registrationNumber ?? null,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
    });
  },
};
