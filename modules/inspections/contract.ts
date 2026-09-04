import { base } from "@/contracts/base";
import {
  StartInspectionInputSchema,
  GetInspectionInputSchema,
  SaveDraftInspectionInputSchema,
  SubmitInspectionInputSchema,
  InspectionOutputSchema,
} from "./schema";

export const startInspectionContract = base
  .route({
    method: "POST",
    path: "/inspections/start",
    successStatus: 201,
    summary: "Start inspection",
    description: "Assignee initiates the inspection process, recording start timestamp and performer authority.",
    tags: ["Inspections"],
  })
  .input(StartInspectionInputSchema)
  .output(InspectionOutputSchema);

export const getInspectionContract = base
  .route({
    method: "GET",
    path: "/inspections/{applicationId}",
    summary: "Get inspection details",
    description: "Retrieves inspection form, measurements, responses, evidence, and status for an application.",
    tags: ["Inspections"],
  })
  .input(GetInspectionInputSchema)
  .output(InspectionOutputSchema);

export const saveDraftInspectionContract = base
  .route({
    method: "PATCH",
    path: "/inspections/{applicationId}/draft",
    summary: "Save draft inspection data",
    description: "Persists measurement entries, template responses, and observations before finalization.",
    tags: ["Inspections"],
  })
  .input(SaveDraftInspectionInputSchema)
  .output(InspectionOutputSchema);

export const submitInspectionContract = base
  .route({
    method: "POST",
    path: "/inspections/{applicationId}/submit",
    summary: "Finalize and submit inspection",
    description: "Verifies measurements and required evidence, computes the pass/fail result, and locks the inspection.",
    tags: ["Inspections"],
  })
  .input(SubmitInspectionInputSchema)
  .output(InspectionOutputSchema);

export const inspectionsContract = {
  start: startInspectionContract,
  get: getInspectionContract,
  saveDraft: saveDraftInspectionContract,
  submit: submitInspectionContract,
};
