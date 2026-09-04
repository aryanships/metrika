import { z } from "zod";

export const BusinessOutputSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  registrationNumber: z.string().nullable(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BusinessOutput = z.infer<typeof BusinessOutputSchema>;

// One owner = one business profile, so a single save procedure covers both
// create and edit.
export const SaveBusinessInputSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  registrationNumber: z.string().optional(),
  contactPhone: z.string().min(1, "Contact phone is required"),
  contactEmail: z.email("Contact email must be valid"),
});
export type SaveBusinessInput = z.infer<typeof SaveBusinessInputSchema>;
