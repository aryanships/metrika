import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const InstrumentStatusSchema = z.enum([
  "REGISTERED",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "EXPIRING_SOON",
  "EXPIRED",
  "INACTIVE",
]);
export type InstrumentStatus = z.infer<typeof InstrumentStatusSchema>;

// Enriched with the two most-used reference names so the owner UI renders
// readable type + location without issuing its own lookups.
export const InstrumentOutputSchema = z.object({
  id: z.string(),
  instrumentCode: z.string(),
  instrumentTypeId: z.string(),
  instrumentTypeName: z.string(),
  instrumentTypeUnit: z.string(),
  businessId: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  yearOfManufacture: z.number().int().nullable(),
  purchaseDate: z.string().nullable(),
  capacity: z.string().nullable(),
  accuracyClass: z.string().nullable(),
  status: InstrumentStatusSchema,
  address: z.string(),
  administrativeUnitId: z.string(),
  administrativeUnitName: z.string(),
  stateName: z.string().nullable(),
  districtName: z.string().nullable(),
  tehsilName: z.string().nullable(),
  villageName: z.string().nullable(),
  postalCode: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InstrumentOutput = z.infer<typeof InstrumentOutputSchema>;

export const ListInstrumentsInputSchema = PaginationInputSchema.extend({
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
  capacity: z.string().min(1, "Capacity is required"),
  accuracyClass: z.string().min(1, "Accuracy class is required"),
  yearOfManufacture: z.number().int().min(1900).max(2100).optional(),
  purchaseDate: z.string().datetime().optional(),
  address: z.string().min(1, "Installation address is required"),
  administrativeUnitId: z.string().min(1, "Location unit is required"),
  postalCode: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
export type CreateInstrumentInput = z.infer<typeof CreateInstrumentInputSchema>;

export const UpdateInstrumentInputSchema = z.object({
  id: z.string().min(1, "Instrument ID is required"),
  capacity: z.string().min(1).optional(),
  accuracyClass: z.string().min(1).optional(),
  yearOfManufacture: z.number().int().min(1900).max(2100).optional(),
  purchaseDate: z.string().datetime().optional(),
});
export type UpdateInstrumentInput = z.infer<typeof UpdateInstrumentInputSchema>;

export const GetInstrumentInputSchema = z.object({
  id: z.string().min(1, "Instrument ID is required"),
});
export type GetInstrumentInput = z.infer<typeof GetInstrumentInputSchema>;

export const IdentifyInstrumentInputSchema = z.object({
  code: z.string().min(1, "Instrument code is required"),
});
export type IdentifyInstrumentInput = z.infer<typeof IdentifyInstrumentInputSchema>;

export const IdentifyInstrumentOutputSchema = z.object({
  id: z.string(),
  instrumentCode: z.string(),
  serialNumber: z.string(),
  status: z.string(),
  instrumentTypeName: z.string(),
  latestApplicationId: z.string().nullable(),
});
export type IdentifyInstrumentOutput = z.infer<typeof IdentifyInstrumentOutputSchema>;

export const InstrumentPassportOutputSchema = z.object({
  instrument: InstrumentOutputSchema,
  activeCertificate: z
    .object({
      id: z.string(),
      certificateCode: z.string(),
      verifiedAt: z.string(),
      validUntil: z.string(),
      status: z.string(),
    })
    .nullable(),
  certificates: z.array(
    z.object({
      id: z.string(),
      certificateCode: z.string(),
      verifiedAt: z.string(),
      validUntil: z.string(),
      status: z.string(),
    })
  ),
  applications: z.array(
    z.object({
      id: z.string(),
      applicationCode: z.string(),
      type: z.string(),
      status: z.string(),
      submittedAt: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
  applicationsCount: z.number().int(),
  certificatesCount: z.number().int(),
});
export type InstrumentPassportOutput = z.infer<typeof InstrumentPassportOutputSchema>;
