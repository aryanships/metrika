import { base } from "@/contracts/base";
import {
  ListLmosInputSchema,
  ListLmosOutputSchema,
  CreateLmoInputSchema,
  LmoCreatedOutputSchema,
  ListGatcsInputSchema,
  ListGatcsOutputSchema,
  CreateGatcInputSchema,
  GatcOutputSchema,
  InviteGatcStaffInputSchema,
  InviteGatcStaffOutputSchema,
  ProvisionAdminInputSchema,
  ProvisionAdminOutputSchema,
  SetAdminScopesInputSchema,
  SetAdminScopesOutputSchema,
} from "./schema";

export const listLmosContract = base
  .route({ method: "GET", path: "/organizations/lmos", summary: "List LMOs", tags: ["Organizations"] })
  .input(ListLmosInputSchema)
  .output(ListLmosOutputSchema);

export const createLmoContract = base
  .route({ method: "POST", path: "/organizations/lmos", successStatus: 201, summary: "Provision LMO", tags: ["Organizations"] })
  .input(CreateLmoInputSchema)
  .output(LmoCreatedOutputSchema);

export const listGatcsContract = base
  .route({ method: "GET", path: "/organizations/gatcs", summary: "List GATCs", tags: ["Organizations"] })
  .input(ListGatcsInputSchema)
  .output(ListGatcsOutputSchema);

export const createGatcContract = base
  .route({ method: "POST", path: "/organizations/gatcs", successStatus: 201, summary: "Provision GATC", tags: ["Organizations"] })
  .input(CreateGatcInputSchema)
  .output(GatcOutputSchema);

export const inviteGatcStaffContract = base
  .route({ method: "POST", path: "/organizations/gatcs/invite-staff", successStatus: 201, summary: "Invite GATC staff", tags: ["Organizations"] })
  .input(InviteGatcStaffInputSchema)
  .output(InviteGatcStaffOutputSchema);

export const provisionAdminContract = base
  .route({ method: "POST", path: "/organizations/admins", successStatus: 201, summary: "Provision admin account", tags: ["Organizations"] })
  .input(ProvisionAdminInputSchema)
  .output(ProvisionAdminOutputSchema);

export const setAdminScopesContract = base
  .route({ method: "PUT", path: "/organizations/admins/scopes", summary: "Set admin scopes", tags: ["Organizations"] })
  .input(SetAdminScopesInputSchema)
  .output(SetAdminScopesOutputSchema);

export const organizationsContract = {
  listLmos: listLmosContract,
  createLmo: createLmoContract,
  listGatcs: listGatcsContract,
  createGatc: createGatcContract,
  inviteGatcStaff: inviteGatcStaffContract,
  provisionAdmin: provisionAdminContract,
  setAdminScopes: setAdminScopesContract,
};
