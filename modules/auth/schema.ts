import { z } from "zod";

export const UserRoleSchema = z.enum([
  "SYSTEM_ADMIN",
  "STATE_ADMIN",
  "DISTRICT_ADMIN",
  "DEPARTMENT_OFFICIAL",
  "LMO",
  "GATC_MANAGER",
  "GATC_OPERATOR",
  "INSTRUMENT_OWNER",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const RegisterOwnerInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  businessName: z.string().min(2, "Business name is required"),
  registrationNumber: z.string().optional(),
});
export type RegisterOwnerInput = z.infer<typeof RegisterOwnerInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const LogoutInputSchema = z.object({}).optional();
export type LogoutInput = z.infer<typeof LogoutInputSchema>;

export const AcceptInvitationInputSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInputSchema>;

export const AuthUserOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: UserRoleSchema,
  phone: z.string().nullable().optional(),
  businessId: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type AuthUserOutput = z.infer<typeof AuthUserOutputSchema>;

export const AuthSessionOutputSchema = z.object({
  user: AuthUserOutputSchema,
  token: z.string().optional(),
  expiresAt: z.string().optional(),
});
export type AuthSessionOutput = z.infer<typeof AuthSessionOutputSchema>;

export const LogoutOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type LogoutOutput = z.infer<typeof LogoutOutputSchema>;
