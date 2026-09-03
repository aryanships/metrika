import { base } from "@/contracts/base";
import {
  ListGatcsInputSchema,
  ListGatcsOutputSchema,
  CreateGatcInputSchema,
  GatcOutputSchema,
  InviteGatcStaffInputSchema,
  InviteStaffOutputSchema,
  ListLmosInputSchema,
  ListLmosOutputSchema,
  CreateLmoInputSchema,
  LmoOutputSchema,
} from "./schema";

export const listGatcsContract = base
  .route({
    method: "GET",
    path: "/organizations/gatcs",
    summary: "List GATC centres",
    description: "Lists Government Approved Test Centres with approval status and authorizations.",
    tags: ["Organizations"],
  })
  .input(ListGatcsInputSchema)
  .output(ListGatcsOutputSchema);

export const createGatcContract = base
  .route({
    method: "POST",
    path: "/organizations/gatcs",
    successStatus: 201,
    summary: "Register GATC centre",
    description: "Provisions a new GATC organisation with approval validity and authorized categories.",
    tags: ["Organizations"],
  })
  .input(CreateGatcInputSchema)
  .output(GatcOutputSchema);

export const inviteGatcStaffContract = base
  .route({
    method: "POST",
    path: "/organizations/gatcs/invite-staff",
    summary: "Invite GATC staff",
    description: "Invites a manager or operator scoped to a specific GATC centre.",
    tags: ["Organizations"],
  })
  .input(InviteGatcStaffInputSchema)
  .output(InviteStaffOutputSchema);

export const listLmosContract = base
  .route({
    method: "GET",
    path: "/organizations/lmos",
    summary: "List Legal Metrology Officers",
    description: "Lists LMO profiles with employee designations, jurisdictions, and expertise.",
    tags: ["Organizations"],
  })
  .input(ListLmosInputSchema)
  .output(ListLmosOutputSchema);

export const createLmoContract = base
  .route({
    method: "POST",
    path: "/organizations/lmos",
    successStatus: 201,
    summary: "Provision LMO profile",
    description: "Provisions a Legal Metrology Officer with verified employee ID and jurisdictions.",
    tags: ["Organizations"],
  })
  .input(CreateLmoInputSchema)
  .output(LmoOutputSchema);

export const organizationsContract = {
  listGatcs: listGatcsContract,
  createGatc: createGatcContract,
  inviteGatcStaff: inviteGatcStaffContract,
  listLmos: listLmosContract,
  createLmo: createLmoContract,
};
