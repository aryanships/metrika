import { createHash, randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { requireStateScope } from "@/middleware/require-state-scope";
import { descendantUnitIds } from "@/lib/geo";
import type { AppUser } from "@/middleware/context";
import type { UserRole } from "@/modules/auth/schema";
import {
  AdminRole,
  CreateGatcInput,
  CreateLmoInput,
  GatcOutput,
  InviteGatcStaffInput,
  InviteGatcStaffOutput,
  ListGatcsInput,
  ListGatcsOutput,
  ListLmosInput,
  ListLmosOutput,
  LmoCreatedOutput,
  ProvisionAdminInput,
  ProvisionAdminOutput,
  SetAdminScopesInput,
  SetAdminScopesOutput,
  ListAdminsInput,
  ListAdminsOutput,
} from "../schema";
import { paginationMeta } from "@/schemas/shared";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validation(path: string, message: string): never {
  throw new ORPCError("VALIDATION_ERROR", { data: { issues: [{ path, message }] } });
}

function conflict(field: string, message: string): never {
  throw new ORPCError("CONFLICT", { data: { field, message } });
}

function notFound(resourceType: string, resourceId: string): never {
  throw new ORPCError("NOT_FOUND", { data: { resourceType, resourceId } });
}

const ADMIN_ROLES: AdminRole[] = ["SYSTEM_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "DEPARTMENT_OFFICIAL"];
const UNRESTRICTED_ROLES: readonly UserRole[] = ["SYSTEM_ADMIN", "DEPARTMENT_OFFICIAL"];

/** Unit IDs visible to an admin, or null when unrestricted. */
async function scopedUnitIds(user: AppUser): Promise<Set<string> | null> {
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return null;
  const scopes = await db.orm.public.AdminScope.where({ userId: user.id }).all();
  if (scopes.length === 0) return new Set();
  return descendantUnitIds(scopes.map((s) => s.administrativeUnitId));
}

/** Reject a unit outside the admin's jurisdiction (no-op for unrestricted admins). */
async function assertScoped(user: AppUser, unitId: string): Promise<void> {
  if (UNRESTRICTED_ROLES.some((r) => user.roles.includes(r))) return;
  await requireStateScope(user, unitId);
}

// ---------------------------------------------------------------------------
// Invited-user creation. The raw token is returned for the demo; production
// would email it and never surface it in an API response.
// ---------------------------------------------------------------------------

interface Invitation {
  token: string;
  hash: string;
}

function newInvitation(): Invitation {
  const token = randomBytes(32).toString("hex");
  return { token, hash: sha256(token) };
}

export const organizationsService = {
  // --------------------------------------------------------------------- LMO
  async listLmos(input: ListLmosInput, user: AppUser): Promise<ListLmosOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    let query = db.orm.public.Lmo;
    if (input.activeOnly) query = query.where({ isActive: true });

    const unitIds = await scopedUnitIds(user);
    if (unitIds !== null) {
      if (unitIds.size === 0) return { items: [], pagination: paginationMeta(0, page, limit) };
      query = query.where((l) => l.baseAdministrativeUnitId.in([...unitIds]));
    }

    const [lmos, totals] = await Promise.all([
      query.orderBy((l) => l.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    const items = await Promise.all(
      lmos.map(async (lmo) => {
        const [user, expertise, jurisdictions] = await Promise.all([
          db.orm.public.User.first({ id: lmo.userId }),
          db.orm.public.LmoInstrumentType.where({ lmoId: lmo.id }).all(),
          db.orm.public.LmoJurisdiction.where({ lmoId: lmo.id }).all(),
        ]);
        return {
          id: lmo.id,
          employeeId: lmo.employeeId,
          designation: lmo.designation,
          isActive: lmo.isActive,
          baseAdministrativeUnitId: lmo.baseAdministrativeUnitId,
          email: user?.email ?? "",
          fullName: user?.fullName ?? "",
          expertiseTypeIds: expertise.map((e) => e.instrumentTypeId),
          jurisdictionIds: jurisdictions.map((j) => j.administrativeUnitId),
          createdAt: lmo.createdAt,
        };
      }),
    );

    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async createLmo(input: CreateLmoInput, user: AppUser): Promise<LmoCreatedOutput> {
    const invitation = newInvitation();

    await assertScoped(user, input.baseAdministrativeUnitId);
    for (const unitId of input.jurisdictionIds) await assertScoped(user, unitId);

    const { lmo, user: createdUser } = await db.transaction(async (tx) => {
      const orm = tx.orm.public;

      const existingUser = await orm.User.where({ email: input.email }).first();
      if (existingUser) conflict("email", "A user with this email already exists");
      const existingEmployee = await orm.Lmo.where({ employeeId: input.employeeId }).first();
      if (existingEmployee) conflict("employeeId", "Employee ID already exists");

      const created = await orm.User.create({
        email: input.email,
        fullName: input.fullName,
        phone: input.phone ?? null,
        passwordHash: null,
        isActive: false,
        invitedAt: new Date().toISOString(),
        invitationTokenHash: invitation.hash,
      });

      await orm.UserRole.create({ userId: created.id, role: "LMO" });

      const lmoProfile = await orm.Lmo.create({
        userId: created.id,
        employeeId: input.employeeId,
        designation: input.designation,
        baseAdministrativeUnitId: input.baseAdministrativeUnitId,
        isActive: true,
      });

      for (const typeId of input.expertiseTypeIds) {
        await orm.LmoInstrumentType.create({ lmoId: lmoProfile.id, instrumentTypeId: typeId });
      }
      for (const unitId of input.jurisdictionIds) {
        await orm.LmoJurisdiction.create({ lmoId: lmoProfile.id, administrativeUnitId: unitId });
      }

      return { lmo: lmoProfile, user: created };
    });

    return {
      id: lmo.id,
      employeeId: lmo.employeeId,
      designation: lmo.designation,
      isActive: lmo.isActive,
      baseAdministrativeUnitId: lmo.baseAdministrativeUnitId,
      email: createdUser.email,
      fullName: createdUser.fullName,
      expertiseTypeIds: input.expertiseTypeIds,
      jurisdictionIds: input.jurisdictionIds,
      createdAt: lmo.createdAt,
      invitationToken: invitation.token,
    };
  },

  // -------------------------------------------------------------------- GATC
  async listGatcs(input: ListGatcsInput, user: AppUser): Promise<ListGatcsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    let query = db.orm.public.Gatc;
    if (input.activeOnly) query = query.where({ isActive: true });

    const unitIds = await scopedUnitIds(user);
    if (unitIds !== null) {
      if (unitIds.size === 0) return { items: [], pagination: paginationMeta(0, page, limit) };
      query = query.where((g) => g.administrativeUnitId.in([...unitIds]));
    }

    const [gatcs, totals] = await Promise.all([
      query.orderBy((g) => g.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
    ]);

    const items = await Promise.all(
      gatcs.map(async (gatc) => {
        const [authorizations, serviceAreas] = await Promise.all([
          db.orm.public.GatcAuthorization.where({ gatcId: gatc.id }).all(),
          db.orm.public.GatcServiceArea.where({ gatcId: gatc.id }).all(),
        ]);
        return {
          id: gatc.id,
          legalName: gatc.legalName,
          approvalNumber: gatc.approvalNumber,
          approvalValidFrom: gatc.approvalValidFrom,
          approvalValidUntil: gatc.approvalValidUntil,
          address: gatc.address,
          administrativeUnitId: gatc.administrativeUnitId,
          latitude: gatc.latitude,
          longitude: gatc.longitude,
          isActive: gatc.isActive,
          authorizedTypeIds: authorizations.map((a) => a.instrumentTypeId),
          serviceAreaIds: serviceAreas.map((s) => s.administrativeUnitId),
          createdAt: gatc.createdAt,
        };
      }),
    );

    return { items, pagination: paginationMeta(totals.total, page, limit) };
  },

  async createGatc(input: CreateGatcInput, user: AppUser): Promise<GatcOutput> {
    if (input.approvalValidFrom >= input.approvalValidUntil) {
      validation("approvalValidUntil", "approvalValidUntil must be after approvalValidFrom");
    }

    await assertScoped(user, input.administrativeUnitId);
    for (const unitId of input.serviceAreaIds) await assertScoped(user, unitId);

    const gatc = await db.transaction(async (tx) => {
      const orm = tx.orm.public;

      const existing = await orm.Gatc.where({ approvalNumber: input.approvalNumber }).first();
      if (existing) conflict("approvalNumber", "Approval number already exists");

      const created = await orm.Gatc.create({
        legalName: input.legalName,
        approvalNumber: input.approvalNumber,
        approvalValidFrom: input.approvalValidFrom,
        approvalValidUntil: input.approvalValidUntil,
        address: input.address,
        administrativeUnitId: input.administrativeUnitId,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        isActive: true,
      });

      for (const typeId of input.authorizedTypeIds) {
        await orm.GatcAuthorization.create({
          gatcId: created.id,
          instrumentTypeId: typeId,
          validFrom: input.approvalValidFrom,
          validUntil: input.approvalValidUntil,
        });
      }
      for (const unitId of input.serviceAreaIds) {
        await orm.GatcServiceArea.create({ gatcId: created.id, administrativeUnitId: unitId });
      }

      return created;
    });

    return {
      id: gatc.id,
      legalName: gatc.legalName,
      approvalNumber: gatc.approvalNumber,
      approvalValidFrom: gatc.approvalValidFrom,
      approvalValidUntil: gatc.approvalValidUntil,
      address: gatc.address,
      administrativeUnitId: gatc.administrativeUnitId,
      latitude: gatc.latitude,
      longitude: gatc.longitude,
      isActive: gatc.isActive,
      authorizedTypeIds: input.authorizedTypeIds,
      serviceAreaIds: input.serviceAreaIds,
      createdAt: gatc.createdAt,
    };
  },

  async inviteGatcStaff(input: InviteGatcStaffInput, user: AppUser): Promise<InviteGatcStaffOutput> {
    const gatc = await db.orm.public.Gatc.first({ id: input.gatcId });
    if (!gatc) notFound("Gatc", input.gatcId);
    await assertScoped(user, gatc.administrativeUnitId);

    let invitationToken: string | null = null;

    const invitedUser = await db.transaction(async (tx) => {
      const orm = tx.orm.public;

      let invited = await orm.User.where({ email: input.email }).first();
      if (!invited) {
        const invitation = newInvitation();
        invitationToken = invitation.token;
        invited = await orm.User.create({
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          passwordHash: null,
          isActive: false,
          invitedAt: new Date().toISOString(),
          invitationTokenHash: invitation.hash,
        });
      } else if (!invited.passwordHash) {
        const invitation = newInvitation();
        invitationToken = invitation.token;
        await orm.User.where({ id: invited.id }).update({
          invitedAt: new Date().toISOString(),
          invitationTokenHash: invitation.hash,
        });
      }

      const membership = await orm.GatcMembership.where({ gatcId: input.gatcId, userId: invited.id }).first();
      if (membership) {
        await orm.GatcMembership.where({ id: membership.id }).update({ role: input.role, isActive: true });
      } else {
        await orm.GatcMembership.create({ gatcId: input.gatcId, userId: invited.id, role: input.role, isActive: true });
      }

      return invited;
    });

    return { gatcId: input.gatcId, userId: invitedUser.id, role: input.role, invitationToken };
  },

  // ------------------------------------------------------- admin provisioning
  async listAdmins(input: ListAdminsInput): Promise<ListAdminsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const roleRows = await db.orm.public.UserRole.where((r) => r.role.in(ADMIN_ROLES)).all();
    const rolesByUser = new Map<string, AdminRole[]>();
    for (const r of roleRows) {
      const list = rolesByUser.get(r.userId) ?? [];
      list.push(r.role as AdminRole);
      rolesByUser.set(r.userId, list);
    }
    const userIds = [...rolesByUser.keys()];
    if (userIds.length === 0) return { items: [], pagination: paginationMeta(0, page, limit) };

    const [users, scopes] = await Promise.all([
      db.orm.public.User.where((u) => u.id.in(userIds))
        .orderBy((u) => u.email.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all(),
      db.orm.public.AdminScope.where((s) => s.userId.in(userIds)).all(),
    ]);

    const scopesByUser = new Map<string, string[]>();
    for (const s of scopes) {
      const list = scopesByUser.get(s.userId) ?? [];
      list.push(s.administrativeUnitId);
      scopesByUser.set(s.userId, list);
    }

    const items = users.map((u) => ({
      userId: u.id,
      email: u.email,
      fullName: u.fullName,
      isActive: u.isActive,
      roles: rolesByUser.get(u.id) ?? [],
      scopeAdministrativeUnitIds: scopesByUser.get(u.id) ?? [],
    }));

    return { items, pagination: paginationMeta(userIds.length, page, limit) };
  },

  async provisionAdmin(input: ProvisionAdminInput): Promise<ProvisionAdminOutput> {
    const expectedType =
      input.role === "STATE_ADMIN" ? "STATE" : input.role === "DISTRICT_ADMIN" ? "DISTRICT" : null;

    if (expectedType && input.scopeAdministrativeUnitIds.length === 0) {
      validation("scopeAdministrativeUnitIds", `${input.role} requires at least one scope unit`);
    }
    if (expectedType) {
      for (const id of input.scopeAdministrativeUnitIds) {
        const unit = await db.orm.public.AdministrativeUnit.first({ id });
        if (!unit) notFound("AdministrativeUnit", id);
        if (unit.type !== expectedType) {
          validation("scopeAdministrativeUnitIds", `${input.role} scope must be a ${expectedType} unit`);
        }
      }
    }

    let invitationToken: string | null = null;

    const user = await db.transaction(async (tx) => {
      const orm = tx.orm.public;

      let admin = await orm.User.where({ email: input.email }).first();
      if (!admin) {
        const invitation = newInvitation();
        invitationToken = invitation.token;
        admin = await orm.User.create({
          email: input.email,
          fullName: input.fullName,
          phone: input.phone ?? null,
          passwordHash: null,
          isActive: false,
          invitedAt: new Date().toISOString(),
          invitationTokenHash: invitation.hash,
        });
      } else if (!admin.passwordHash) {
        const invitation = newInvitation();
        invitationToken = invitation.token;
        await orm.User.where({ id: admin.id }).update({
          invitedAt: new Date().toISOString(),
          invitationTokenHash: invitation.hash,
        });
      }

      const existingRole = await orm.UserRole.where({ userId: admin.id, role: input.role }).first();
      if (!existingRole) await orm.UserRole.create({ userId: admin.id, role: input.role });

      for (const unitId of input.scopeAdministrativeUnitIds) {
        const existingScope = await orm.AdminScope.where({ userId: admin.id, administrativeUnitId: unitId }).first();
        if (!existingScope) await orm.AdminScope.create({ userId: admin.id, administrativeUnitId: unitId });
      }

      return admin;
    });

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: input.role,
      scopeAdministrativeUnitIds: input.scopeAdministrativeUnitIds,
      invitationToken,
    };
  },

  async setAdminScopes(input: SetAdminScopesInput): Promise<SetAdminScopesOutput> {
    const user = await db.orm.public.User.first({ id: input.userId });
    if (!user) notFound("User", input.userId);

    const roles = await db.orm.public.UserRole.where({ userId: user.id }).all();
    const adminRoles = roles.map((r) => r.role).filter((r) => ADMIN_ROLES.includes(r as AdminRole));
    if (adminRoles.length === 0) {
      validation("userId", "User has no administrative role");
    }

    // Each scope unit must match the level its role governs.
    const allowedTypes = new Set<string>();
    if (adminRoles.includes("STATE_ADMIN")) allowedTypes.add("STATE");
    if (adminRoles.includes("DISTRICT_ADMIN")) allowedTypes.add("DISTRICT");

    if (allowedTypes.size === 0) {
      if (input.administrativeUnitIds.length > 0) {
        validation("administrativeUnitIds", `${adminRoles.join(", ")} does not accept scoped units`);
      }
    } else {
      for (const id of input.administrativeUnitIds) {
        const unit = await db.orm.public.AdministrativeUnit.first({ id });
        if (!unit) notFound("AdministrativeUnit", id);
        if (!allowedTypes.has(unit.type)) {
          validation("administrativeUnitIds", `${adminRoles.join(", ")} scope must be a ${[...allowedTypes].join(" or ")} unit`);
        }
      }
    }

    await db.transaction(async (tx) => {
      const orm = tx.orm.public;
      await orm.AdminScope.where({ userId: input.userId }).deleteAll();
      for (const unitId of input.administrativeUnitIds) {
        await orm.AdminScope.create({ userId: input.userId, administrativeUnitId: unitId });
      }
    });

    return { userId: input.userId, administrativeUnitIds: input.administrativeUnitIds };
  },
};
