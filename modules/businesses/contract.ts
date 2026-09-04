import { base } from "@/contracts/base";
import { BusinessOutputSchema, SaveBusinessInputSchema } from "./schema";

export const getBusinessContract = base
  .route({
    method: "GET",
    path: "/businesses/me",
    summary: "Get my business profile",
    description: "Returns the authenticated owner's business profile, or null if not created yet.",
    tags: ["Businesses"],
  })
  .output(BusinessOutputSchema.nullable());

export const saveBusinessContract = base
  .route({
    method: "POST",
    path: "/businesses/me",
    summary: "Create or update business profile",
    description: "Creates or updates the authenticated owner's single business profile.",
    tags: ["Businesses"],
  })
  .input(SaveBusinessInputSchema)
  .output(BusinessOutputSchema);

export const businessesContract = {
  get: getBusinessContract,
  save: saveBusinessContract,
};
