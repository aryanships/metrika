import { z } from "zod";

export const SearchInputSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const SearchInstrumentSchema = z.object({
  id: z.string(),
  instrumentCode: z.string(),
  serialNumber: z.string(),
  instrumentTypeName: z.string(),
  businessName: z.string(),
  status: z.string(),
});
export type SearchInstrument = z.infer<typeof SearchInstrumentSchema>;

export const SearchCertificateSchema = z.object({
  id: z.string(),
  certificateCode: z.string(),
  instrumentCode: z.string(),
  businessName: z.string(),
  status: z.string(),
  validUntil: z.string(),
});
export type SearchCertificate = z.infer<typeof SearchCertificateSchema>;

export const SearchApplicationSchema = z.object({
  id: z.string(),
  applicationCode: z.string(),
  instrumentCode: z.string(),
  type: z.string(),
  status: z.string(),
});
export type SearchApplication = z.infer<typeof SearchApplicationSchema>;

export const SearchBusinessSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  registrationNumber: z.string().nullable(),
  contactPhone: z.string(),
});
export type SearchBusiness = z.infer<typeof SearchBusinessSchema>;

export const SearchOutputSchema = z.object({
  query: z.string(),
  instruments: z.array(SearchInstrumentSchema),
  certificates: z.array(SearchCertificateSchema),
  applications: z.array(SearchApplicationSchema),
  businesses: z.array(SearchBusinessSchema),
});
export type SearchOutput = z.infer<typeof SearchOutputSchema>;
