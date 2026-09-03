import { applicationsRepository, ApplicationRecord } from "./repository";
import {
  ListApplicationsInput,
  ListApplicationsOutput,
  CreateDraftApplicationInput,
  UpdateDraftApplicationInput,
  GetApplicationInput,
  SubmitApplicationInput,
  CancelApplicationInput,
  ReviewActionInput,
  RequestCorrectionsInput,
  RejectApplicationInput,
  ApplicationOutput,
} from "../schema";

function toSafeApplicationOutput(rec: ApplicationRecord): ApplicationOutput {
  return {
    id: rec.id,
    applicationNumber: rec.applicationNumber,
    businessId: rec.businessId,
    instrumentId: rec.instrumentId,
    type: rec.type as any,
    status: rec.status as any,
    preferredDateStart: rec.preferredDateStart ? rec.preferredDateStart.toISOString() : null,
    preferredDateEnd: rec.preferredDateEnd ? rec.preferredDateEnd.toISOString() : null,
    submittedAt: rec.submittedAt ? rec.submittedAt.toISOString() : null,
    reviewedById: rec.reviewedById ?? null,
    reviewNotes: rec.reviewNotes ?? null,
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
  };
}

export const applicationsService = {
  async listMine(
    input: ListApplicationsInput,
    businessId = "biz_demo"
  ): Promise<ListApplicationsOutput> {
    const mock: ApplicationRecord = {
      id: "app_demo_1",
      applicationNumber: "APP-DL-2024-0012",
      businessId,
      instrumentId: "inst_demo_1",
      type: "INITIAL_VERIFICATION",
      status: "APPROVED",
      preferredDateStart: new Date("2024-02-01"),
      preferredDateEnd: new Date("2024-02-05"),
      submittedAt: new Date("2024-01-15"),
      reviewedById: "usr_admin_1",
      reviewNotes: "All documents verified",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      items: [toSafeApplicationOutput(mock)],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async get(input: GetApplicationInput): Promise<ApplicationOutput> {
    const mock: ApplicationRecord = {
      id: input.id,
      applicationNumber: "APP-DL-2024-0012",
      businessId: "biz_demo",
      instrumentId: "inst_demo_1",
      type: "INITIAL_VERIFICATION",
      status: "APPROVED",
      preferredDateStart: new Date("2024-02-01"),
      preferredDateEnd: new Date("2024-02-05"),
      submittedAt: new Date("2024-01-15"),
      reviewedById: "usr_admin_1",
      reviewNotes: "All documents verified",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return toSafeApplicationOutput(mock);
  },

  async createDraft(
    input: CreateDraftApplicationInput,
    businessId = "biz_demo"
  ): Promise<ApplicationOutput> {
    const created = await applicationsRepository.create({
      applicationNumber: `APP-DRAFT-${Date.now().toString().slice(-6)}`,
      businessId,
      instrumentId: input.instrumentId,
      type: input.type,
      status: "DRAFT",
      preferredDateStart: input.preferredDateStart ? new Date(input.preferredDateStart) : null,
      preferredDateEnd: input.preferredDateEnd ? new Date(input.preferredDateEnd) : null,
      submittedAt: null,
      reviewedById: null,
      reviewNotes: null,
    });
    return toSafeApplicationOutput(created);
  },

  async updateDraft(input: UpdateDraftApplicationInput): Promise<ApplicationOutput> {
    const rec = await this.get({ id: input.id });
    return rec;
  },

  async submit(input: SubmitApplicationInput): Promise<ApplicationOutput> {
    const rec = await this.get({ id: input.id });
    return {
      ...rec,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    };
  },

  async cancel(input: CancelApplicationInput): Promise<ApplicationOutput> {
    const rec = await this.get({ id: input.id });
    return {
      ...rec,
      status: "CANCELLED",
      reviewNotes: `Cancelled by user: ${input.reason}`,
    };
  },

  async startReview(input: ReviewActionInput, reviewerId = "usr_admin"): Promise<ApplicationOutput> {
    const rec = await this.get({ id: input.id });
    return {
      ...rec,
      status: "UNDER_REVIEW",
      reviewedById: reviewerId,
    };
  },

  async requestCorrections(input: RequestCorrectionsInput): Promise<ApplicationOutput> {
    const rec = await this.get({ id: input.id });
    return {
      ...rec,
      status: "CORRECTION_REQUIRED",
      reviewNotes: input.reason,
    };
  },

  async approve(input: ReviewActionInput): Promise<ApplicationOutput> {
    const rec = await this.get({ id: input.id });
    return {
      ...rec,
      status: "APPROVED",
      reviewNotes: input.notes ?? "Approved",
    };
  },

  async reject(input: RejectApplicationInput): Promise<ApplicationOutput> {
    const rec = await this.get({ id: input.id });
    return {
      ...rec,
      status: "REJECTED",
      reviewNotes: input.reason,
    };
  },
};
