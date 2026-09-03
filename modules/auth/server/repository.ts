/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `auth` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/auth/server/service.ts` or procedures.
 */

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  phone?: string | null;
  businessId?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export const authRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    // In Phase 0 skeleton, placeholder returning null. Phase 1/2 connects Prisma.
    return null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    return null;
  },

  async createUser(data: Omit<UserRecord, "id" | "createdAt">): Promise<UserRecord> {
    const record: UserRecord = {
      id: `usr_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
    return record;
  },

  async findInvitationByToken(token: string) {
    return null;
  },
};
