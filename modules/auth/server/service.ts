import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import type { AppUser } from "@/middleware/context";
import { authRepository, UserRecord } from "./repository";
import {
  AcceptInvitationInput,
  AuthUserOutput,
  LoginInput,
  RegisterOwnerInput,
  UserRole,
} from "../schema";

const BCRYPT_ROUNDS = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: AuthUserOutput;
  sessionToken: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toSafeUser(user: UserRecord, roles: UserRole[], businessId: string | null): AuthUserOutput {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles,
    phone: user.phone,
    businessId,
    isActive: user.isActive,
  };
}

async function loadUserIdentity(userId: string): Promise<{ roles: UserRole[]; businessId: string | null }> {
  const [roles, business] = await Promise.all([
    authRepository.findRoles(userId),
    authRepository.findBusinessId(userId),
  ]);
  return {
    roles: roles.map((r) => r.role),
    businessId: business?.id ?? null,
  };
}

export const authService = {
  async registerOwner(input: RegisterOwnerInput): Promise<AuthResult> {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new ORPCError("CONFLICT", {
        data: { field: "email", message: "An account with this email already exists" },
      });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const created = await db.transaction(async (tx) => {
      const orm = tx.orm;
      const user = await authRepository.createUser(
        {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone ?? null,
          isActive: true,
        },
        orm,
      );
      await authRepository.createRole(user.id, "INSTRUMENT_OWNER", orm);
      await authRepository.createSession(
        { tokenHash: sha256(sessionToken), userId: user.id, expiresAt },
        orm,
      );
      return user;
    });

    return {
      user: toSafeUser(created, ["INSTRUMENT_OWNER"], null),
      sessionToken,
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findByEmail(input.email);
    if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new ORPCError("UNAUTHORIZED", { message: "Invalid email or password" });
    }
    if (!user.isActive) {
      throw new ORPCError("FORBIDDEN", { data: { reason: "Account is inactive" } });
    }

    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await authRepository.createSession({ tokenHash: sha256(sessionToken), userId: user.id, expiresAt });

    const { roles, businessId } = await loadUserIdentity(user.id);
    return { user: toSafeUser(user, roles, businessId), sessionToken };
  },

  async logout(sessionToken: string | null | undefined): Promise<void> {
    if (sessionToken) {
      await authRepository.revokeSessionByTokenHash(sha256(sessionToken));
    }
  },

  async acceptInvitation(input: AcceptInvitationInput): Promise<AuthResult> {
    const user = await authRepository.findByEmail(input.email);
    if (!user || !user.invitationTokenHash || user.invitationTokenHash !== sha256(input.token)) {
      throw new ORPCError("UNAUTHORIZED", { message: "Invalid invitation" });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await db.transaction(async (tx) => {
      const orm = tx.orm;
      await authRepository.updateUser(
        user.id,
        {
          passwordHash,
          fullName: input.fullName,
          invitationTokenHash: null,
          invitedAt: null,
          isActive: true,
        },
        orm,
      );
      await authRepository.createSession(
        { tokenHash: sha256(sessionToken), userId: user.id, expiresAt },
        orm,
      );
    });

    const refreshed = await authRepository.findById(user.id);
    const { roles, businessId } = await loadUserIdentity(user.id);
    return {
      user: toSafeUser(refreshed ?? { ...user, fullName: input.fullName }, roles, businessId),
      sessionToken,
    };
  },

  async resolveSession(token: string | null | undefined): Promise<AppUser | null> {
    if (!token) return null;
    const session = await authRepository.findSessionByTokenHash(sha256(token));
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    const user = await authRepository.findById(session.userId);
    if (!user || !user.isActive) return null;
    const { roles, businessId } = await loadUserIdentity(user.id);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      phone: user.phone,
      businessId,
      isActive: user.isActive,
    };
  },
};
