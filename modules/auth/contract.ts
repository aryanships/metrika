import { base } from "@/contracts/base";
import {
  RegisterOwnerInputSchema,
  LoginInputSchema,
  LogoutInputSchema,
  AcceptInvitationInputSchema,
  AuthUserOutputSchema,
  AuthSessionOutputSchema,
  LogoutOutputSchema,
} from "./schema";

export const registerOwnerContract = base
  .route({
    method: "POST",
    path: "/auth/register-owner",
    successStatus: 201,
    summary: "Register instrument owner",
    description:
      "Registers a new business owner account. Role is strictly restricted to INSTRUMENT_OWNER.",
    tags: ["Auth"],
  })
  .input(RegisterOwnerInputSchema)
  .output(AuthSessionOutputSchema);

export const loginContract = base
  .route({
    method: "POST",
    path: "/auth/login",
    summary: "Sign in with email and password",
    description: "Authenticates a user and issues a session.",
    tags: ["Auth"],
  })
  .input(LoginInputSchema)
  .output(AuthSessionOutputSchema);

export const logoutContract = base
  .route({
    method: "POST",
    path: "/auth/logout",
    summary: "Sign out",
    description: "Revokes the active session.",
    tags: ["Auth"],
  })
  .input(LogoutInputSchema)
  .output(LogoutOutputSchema);

export const meContract = base
  .route({
    method: "GET",
    path: "/auth/me",
    summary: "Get current authenticated user",
    description: "Retrieves the currently authenticated user profile.",
    tags: ["Auth"],
  })
  .output(AuthUserOutputSchema);

export const acceptInvitationContract = base
  .route({
    method: "POST",
    path: "/auth/accept-invitation",
    summary: "Accept staff/admin invitation",
    description: "Activates an invited administrative or field staff user account.",
    tags: ["Auth"],
  })
  .input(AcceptInvitationInputSchema)
  .output(AuthSessionOutputSchema);

export const authContract = {
  registerOwner: registerOwnerContract,
  login: loginContract,
  logout: logoutContract,
  me: meContract,
  acceptInvitation: acceptInvitationContract,
};
