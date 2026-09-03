/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `auth` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/auth/server/service.ts` or procedures.
 */
import { db } from "@/prisma/db";

export type Orm = typeof db.orm;

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  invitedAt: string | null;
  invitationTokenHash: string | null;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export const authRepository = {
  findByEmail(email: string, orm: Orm = db.orm) {
    return orm.public.User.where({ email }).first();
  },

  findById(id: string, orm: Orm = db.orm) {
    return orm.public.User.where({ id }).first();
  },

  findRoles(userId: string, orm: Orm = db.orm) {
    return orm.public.UserRole.where({ userId }).all();
  },

  findBusinessId(userId: string, orm: Orm = db.orm) {
    return orm.public.Business.where({ userId }).select("id").first();
  },

  createUser(
    data: {
      email: string;
      passwordHash: string | null;
      fullName: string;
      phone?: string | null;
      isActive?: boolean;
      invitedAt?: string | null;
    },
    orm: Orm = db.orm,
  ) {
    return orm.public.User.create(data);
  },

  createRole(
    userId: string,
    role: "INSTRUMENT_OWNER" | "LMO" | "DISTRICT_ADMIN" | "STATE_ADMIN" | "DEPARTMENT_OFFICIAL" | "SYSTEM_ADMIN",
    orm: Orm = db.orm,
  ) {
    return orm.public.UserRole.create({ userId, role });
  },

  updateUser(
    id: string,
    data: Partial<Pick<UserRecord, "passwordHash" | "fullName" | "phone" | "isActive" | "invitedAt" | "invitationTokenHash">>,
    orm: Orm = db.orm,
  ) {
    return orm.public.User.where({ id }).update(data);
  },

  createSession(data: { tokenHash: string; userId: string; expiresAt: string }, orm: Orm = db.orm) {
    return orm.public.Session.create(data);
  },

  findSessionByTokenHash(tokenHash: string, orm: Orm = db.orm) {
    return orm.public.Session.where({ tokenHash }).first();
  },

  revokeSessionByTokenHash(tokenHash: string, orm: Orm = db.orm) {
    return orm.public.Session.where({ tokenHash }).update({ revokedAt: new Date().toISOString() });
  },
};
