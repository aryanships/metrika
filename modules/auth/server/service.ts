import { authRepository, UserRecord } from "./repository";
import {
  RegisterOwnerInput,
  LoginInput,
  AcceptInvitationInput,
  AuthUserOutput,
  AuthSessionOutput,
  LogoutOutput,
} from "../schema";

function toSafeUserOutput(user: UserRecord): AuthUserOutput {
  // SECURITY: Never include passwordHash or private session secrets
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as any,
    phone: user.phone ?? null,
    businessId: user.businessId ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authService = {
  async registerOwner(input: RegisterOwnerInput): Promise<AuthSessionOutput> {
    const user = await authRepository.createUser({
      email: input.email,
      passwordHash: "placeholder_hash",
      fullName: input.fullName,
      role: "INSTRUMENT_OWNER",
      phone: input.phone,
      businessId: `biz_${Date.now()}`,
      isActive: true,
    });

    return {
      user: toSafeUserOutput(user),
      token: "demo_session_token",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },

  async login(input: LoginInput): Promise<AuthSessionOutput> {
    const mockUser: UserRecord = {
      id: "usr_demo",
      email: input.email,
      passwordHash: "demo_hash",
      fullName: "Demo User",
      role: "INSTRUMENT_OWNER",
      phone: null,
      businessId: null,
      isActive: true,
      createdAt: new Date(),
    };

    return {
      user: toSafeUserOutput(mockUser),
      token: "demo_session_token",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },

  async logout(): Promise<LogoutOutput> {
    return {
      success: true,
      message: "Successfully logged out",
    };
  },

  async getCurrentUser(userId?: string): Promise<AuthUserOutput> {
    const mockUser: UserRecord = {
      id: userId ?? "usr_demo",
      email: "demo@example.com",
      passwordHash: "demo_hash",
      fullName: "Demo User",
      role: "INSTRUMENT_OWNER",
      phone: null,
      businessId: null,
      isActive: true,
      createdAt: new Date(),
    };
    return toSafeUserOutput(mockUser);
  },

  async acceptInvitation(input: AcceptInvitationInput): Promise<AuthSessionOutput> {
    const user = await authRepository.createUser({
      email: "invited@example.com",
      passwordHash: "placeholder_hash",
      fullName: input.fullName,
      role: "LMO",
      phone: null,
      businessId: null,
      isActive: true,
    });

    return {
      user: toSafeUserOutput(user),
      token: "demo_session_token",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },
};
