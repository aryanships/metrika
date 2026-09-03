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
    path: "/inspections/{id}",
    summary: "Get inspection details",
    description: "Retrieves inspection form, measurements, observations, and status.",
    tags: ["Inspections"],
  })
  .input(GetInspectionInputSchema)
  .output(InspectionOutputSchema);

export const saveDraftInspectionContract = base
  .route({
    method: "PATCH",
    path: "/inspections/{id}/draft",
    summary: "Save draft inspection data",
    description: "Persists progressive measurement entries and checklist responses before finalization.",
    tags: ["Inspections"],
  })
  .input(SaveDraftInspectionInputSchema)
  .output(InspectionOutputSchema);

export const submitInspectionContract = base
  .route({
    method: "POST",
    path: "/inspections/{id}/submit",
    summary: "Finalize and submit inspection",
    description: "Calculates pass/fail outcome, verifies evidence requirements, locks inspection, and commits audit record.",
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
