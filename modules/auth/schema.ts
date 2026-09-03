import { z } from "zod";

// Mirrors the `RoleName` enum in the data contract. Centre-scoped authority is
// held by GatcMembership, so GATC staff have no global role of their own here.
export const UserRoleSchema = z.enum([
  "SYSTEM_ADMIN",
  "STATE_ADMIN",
  "DISTRICT_ADMIN",
  "DEPARTMENT_OFFICIAL",
  "LMO",
  "INSTRUMENT_OWNER",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const RegisterOwnerInputSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
});
export type RegisterOwnerInput = z.infer<typeof RegisterOwnerInputSchema>;

export const LoginInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const LogoutInputSchema = z.object({}).optional();
export type LogoutInput = z.infer<typeof LogoutInputSchema>;

export const AcceptInvitationInputSchema = z.object({
  email: z.email(),
  token: z.string().min(1, "Invitation token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInputSchema>;

// Never include passwordHash, invitation tokens, or session tokens here.
export const AuthUserOutputSchema = z.object({
  id: z.string(),
  email: z.email(),
  fullName: z.string(),
  roles: z.array(UserRoleSchema),
  phone: z.string().nullable(),
  businessId: z.string().nullable(),
  isActive: z.boolean(),
});
export type AuthUserOutput = z.infer<typeof AuthUserOutputSchema>;

export const AuthSessionOutputSchema = z.object({
  user: AuthUserOutputSchema,
});
export type AuthSessionOutput = z.infer<typeof AuthSessionOutputSchema>;

export const LogoutOutputSchema = z.object({
  success: z.boolean(),
});
export type LogoutOutput = z.infer<typeof LogoutOutputSchema>;
