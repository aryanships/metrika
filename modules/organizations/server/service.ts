import { organizationsRepository } from "./repository";
import {
  ListGatcsInput,
  ListGatcsOutput,
  CreateGatcInput,
  GatcOutput,
  InviteGatcStaffInput,
  InviteStaffOutput,
  ListLmosInput,
  ListLmosOutput,
  CreateLmoInput,
  LmoOutput,
} from "../schema";

export const organizationsService = {
  async listGatcs(input: ListGatcsInput): Promise<ListGatcsOutput> {
    return {
      items: [
        {
          id: "gatc_delhi_central",
          legalName: "Apex Metrology Solutions Ltd",
          approvalNumber: "GATC-DL-2024-001",
          stateId: "unit_demo_state",
          districtId: "unit_demo_dist",
          status: "ACTIVE",
          approvalValidUntil: new Date("2026-12-31").toISOString(),
          contactEmail: "info@apexmetrology.example.com",
          contactPhone: "9876543210",
          createdAt: new Date().toISOString(),
        },
      ],
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

  async createGatc(input: CreateGatcInput): Promise<GatcOutput> {
    const created = await organizationsRepository.createGatc({
      legalName: input.legalName,
      approvalNumber: input.approvalNumber,
      stateId: input.stateId,
      districtId: input.districtId,
      status: "ACTIVE",
      approvalValidUntil: new Date(input.approvalValidUntil),
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
    });
    return {
      ...created,
      approvalValidUntil: created.approvalValidUntil.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };
  },

  async inviteGatcStaff(input: InviteGatcStaffInput): Promise<InviteStaffOutput> {
    return {
      success: true,
      invitationId: `inv_${Date.now()}`,
      email: input.email,
      message: `Invitation successfully dispatched to ${input.email} for GATC centre.`,
    };
  },

  async listLmos(input: ListLmosInput): Promise<ListLmosOutput> {
    return {
      items: [
        {
          id: "lmo_demo_officer",
          userId: "usr_lmo_1",
          employeeId: "LMO-DL-042",
          designation: "Inspector Legal Metrology",
          stateId: "unit_demo_state",
          districtId: "unit_demo_dist",
          active: true,
          expertiseTypeIds: ["it_weighing_scale"],
          createdAt: new Date().toISOString(),
        },
      ],
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

  async createLmo(input: CreateLmoInput): Promise<LmoOutput> {
    const created = await organizationsRepository.createLmo({
      userId: `usr_${Date.now()}`,
      employeeId: input.employeeId,
      designation: input.designation,
      stateId: input.stateId,
      districtId: input.districtId,
      active: true,
      expertiseTypeIds: input.expertiseTypeIds,
    });
    return {
      ...created,
      createdAt: created.createdAt.toISOString(),
    };
  },
};
