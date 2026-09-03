import { base } from "@/contracts/base";
import {
  ListInstrumentsInputSchema,
  ListInstrumentsOutputSchema,
  CreateInstrumentInputSchema,
  UpdateInstrumentInputSchema,
  GetInstrumentInputSchema,
  InstrumentOutputSchema,
  InstrumentPassportOutputSchema,
} from "./schema";

export const listInstrumentsContract = base
  .route({
    method: "GET",
    path: "/instruments",
    summary: "List instruments",
    description: "Lists registered instruments. Owners see only their own instruments.",
    tags: ["Instruments"],
  })
  .input(ListInstrumentsInputSchema)
  .output(ListInstrumentsOutputSchema);

export const getInstrumentContract = base
  .route({
    method: "GET",
    path: "/instruments/{id}",
    summary: "Get instrument details",
    description: "Fetches details of an instrument by ID or permanent code.",
    tags: ["Instruments"],
  })
  .input(GetInstrumentInputSchema)
  .output(InstrumentOutputSchema);

export const createInstrumentContract = base
  .route({
    method: "POST",
    path: "/instruments",
    successStatus: 201,
    summary: "Register new instrument",
    description: "Registers an instrument, generates a permanent DMI code, and enforces duplicate serial protection.",
    tags: ["Instruments"],
  })
  .input(CreateInstrumentInputSchema)
  .output(InstrumentOutputSchema);

export const updateInstrumentContract = base
  .route({
    method: "PATCH",
    path: "/instruments/{id}",
    summary: "Update instrument metadata",
    description: "Updates safe editable fields of an instrument.",
    tags: ["Instruments"],
  })
  .input(UpdateInstrumentInputSchema)
  .output(InstrumentOutputSchema);

export const passportInstrumentContract = base
  .route({
    method: "GET",
    path: "/instruments/{id}/passport",
    summary: "Get instrument digital passport",
    description: "Retrieves complete lifecycle passport including active certificate and verification history.",
    tags: ["Instruments"],
  })
  .input(GetInstrumentInputSchema)
  .output(InstrumentPassportOutputSchema);

export const instrumentsContract = {
  list: listInstrumentsContract,
  get: getInstrumentContract,
  create: createInstrumentContract,
  update: updateInstrumentContract,
  passport: passportInstrumentContract,
};
