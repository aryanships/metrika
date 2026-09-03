import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const InstrumentStatusSchema = z.enum([
  "REGISTERED",
  "VERIFICATION_PENDING",
  "VERIFIED",
  "REJECTED",
  "EXPIRING_SOON",
  "EXPIRED",
  "DECOMMISSIONED",
]);
export type InstrumentStatus = z.infer<typeof InstrumentStatusSchema>;

export const InstrumentOutputSchema = z.object({
  id: z.string(),
  code: z.string(),
  businessId: z.string(),
  instrumentTypeId: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  capacity: z.number(),
  accuracyClass: z.string(),
  purchaseDate: z.string(),
  stateId: z.string(),
  districtId: z.string(),
  tehsilId: z.string().nullable().optional(),
  villageId: z.string().nullable().optional(),
  status: InstrumentStatusSchema,
  currentCertificateId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InstrumentOutput = z.infer<typeof InstrumentOutputSchema>;

export const ListInstrumentsInputSchema = PaginationInputSchema.extend({
  businessId: z.string().optional(),
  instrumentTypeId: z.string().optional(),
  status: InstrumentStatusSchema.optional(),
});
export type ListInstrumentsInput = z.infer<typeof ListInstrumentsInputSchema>;

export const ListInstrumentsOutputSchema = z.object({
  items: z.array(InstrumentOutputSchema),
  pagination: PaginationMetaSchema,
});
export type ListInstrumentsOutput = z.infer<typeof ListInstrumentsOutputSchema>;

export const CreateInstrumentInputSchema = z.object({
  instrumentTypeId: z.string().min(1, "Instrument type is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  capacity: z.number().positive("Capacity must be positive"),
  accuracyClass: z.string().min(1, "Accuracy class is required"),
  purchaseDate: z.string().datetime(),
  stateId: z.string().min(1, "State is required"),
  districtId: z.string().min(1, "District is required"),
  tehsilId: z.string().optional(),
  villageId: z.string().optional(),
});
export type CreateInstrumentInput = z.infer<typeof CreateInstrumentInputSchema>;

export const UpdateInstrumentInputSchema = z.object({
  id: z.string().min(1, "Instrument ID is required"),
  model: z.string().optional(),
  tehsilId: z.string().optional(),
  villageId: z.string().optional(),
});
export type UpdateInstrumentInput = z.infer<typeof UpdateInstrumentInputSchema>;

export const GetInstrumentInputSchema = z.object({
  id: z.string().min(1, "Instrument ID or code is required"),
});
export type GetInstrumentInput = z.infer<typeof GetInstrumentInputSchema>;

export const InstrumentPassportOutputSchema = z.object({
  instrument: InstrumentOutputSchema,
  activeCertificate: z
    .object({
      id: z.string(),
      certificateCode: z.string(),
      validFrom: z.string(),
      validUntil: z.string(),
      status: z.string(),
      issuingAuthority: z.string(),
      qrUrl: z.string(),
    })
    .nullable()
    .optional(),
  applicationsCount: z.number().int(),
  inspectionsCount: z.number().int(),
  certificatesCount: z.number().int(),
});
export type InstrumentPassportOutput = z.infer<typeof InstrumentPassportOutputSchema>;
