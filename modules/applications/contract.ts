import { base } from "@/contracts/base";
import {
  ListApplicationsInputSchema,
  ListApplicationsOutputSchema,
  CreateDraftApplicationInputSchema,
  UpdateDraftApplicationInputSchema,
  GetApplicationInputSchema,
  SubmitApplicationInputSchema,
  CancelApplicationInputSchema,
  ReviewActionInputSchema,
  RequestCorrectionsInputSchema,
  RejectApplicationInputSchema,
  ApplicationOutputSchema,
} from "./schema";

export const listMineApplicationsContract = base
  .route({
    method: "GET",
    path: "/applications/mine",
    summary: "List owner's applications",
    description: "Lists verification applications created by the authenticated owner.",
    tags: ["Applications"],
  })
  .input(ListApplicationsInputSchema)
  .output(ListApplicationsOutputSchema);

export const getApplicationContract = base
  .route({
    method: "GET",
    path: "/applications/{id}",
    summary: "Get application details",
    description: "Retrieves status, history, and metadata of a verification application.",
    tags: ["Applications"],
  })
  .input(GetApplicationInputSchema)
  .output(ApplicationOutputSchema);

export const createDraftApplicationContract = base
  .route({
    method: "POST",
    path: "/applications/draft",
    successStatus: 201,
    summary: "Create draft application",
    description: "Creates an editable draft verification application.",
    tags: ["Applications"],
  })
  .input(CreateDraftApplicationInputSchema)
  .output(ApplicationOutputSchema);

export const updateDraftApplicationContract = base
  .route({
    method: "PATCH",
    path: "/applications/{id}/draft",
    summary: "Update draft application",
    description: "Updates draft parameters and preferred inspection windows.",
    tags: ["Applications"],
  })
  .input(UpdateDraftApplicationInputSchema)
  .output(ApplicationOutputSchema);

export const submitApplicationContract = base
  .route({
    method: "POST",
    path: "/applications/{id}/submit",
    summary: "Submit application for review",
    description: "Validates completeness and transitions application to SUBMITTED.",
    tags: ["Applications"],
  })
  .input(SubmitApplicationInputSchema)
  .output(ApplicationOutputSchema);

export const cancelApplicationContract = base
  .route({
    method: "POST",
    path: "/applications/{id}/cancel",
    summary: "Cancel application",
    description: "Cancels an open application with recorded reason.",
    tags: ["Applications"],
  })
  .input(CancelApplicationInputSchema)
  .output(ApplicationOutputSchema);

export const startReviewContract = base
  .route({
    method: "POST",
    path: "/applications/{id}/start-review",
    summary: "Start application review",
    description: "State admin takes an application into UNDER_REVIEW state.",
    tags: ["Applications"],
  })
  .input(ReviewActionInputSchema)
  .output(ApplicationOutputSchema);

export const requestCorrectionsContract = base
  .route({
    method: "POST",
    path: "/applications/{id}/request-corrections",
    summary: "Request owner corrections",
    description: "Returns an application to the owner with required correction remarks.",
    tags: ["Applications"],
  })
  .input(RequestCorrectionsInputSchema)
  .output(ApplicationOutputSchema);

export const approveApplicationContract = base
  .route({
    method: "POST",
    path: "/applications/{id}/approve",
    summary: "Approve application for assignment",
    description: "Approves application, qualifying it for LMO or GATC scheduling.",
    tags: ["Applications"],
  })
  .input(ReviewActionInputSchema)
  .output(ApplicationOutputSchema);

export const rejectApplicationContract = base
  .route({
    method: "POST",
    path: "/applications/{id}/reject",
    summary: "Reject application",
    description: "Formally rejects an application with recorded justification.",
    tags: ["Applications"],
  })
  .input(RejectApplicationInputSchema)
  .output(ApplicationOutputSchema);

export const applicationsContract = {
  listMine: listMineApplicationsContract,
  get: getApplicationContract,
  createDraft: createDraftApplicationContract,
  updateDraft: updateDraftApplicationContract,
  submit: submitApplicationContract,
  cancel: cancelApplicationContract,
  startReview: startReviewContract,
  requestCorrections: requestCorrectionsContract,
  approve: approveApplicationContract,
  reject: rejectApplicationContract,
};
