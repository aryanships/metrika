/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `applications` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/applications/server/service.ts` or procedures.
 */
import { db } from "@/prisma/db";
import type {
  ApplicationStatus,
  ApplicationType,
  Priority,
  VerificationRoute,
} from "../schema";

export type Orm = typeof db.orm;

export interface CreateApplicationData {
  applicationCode: string;
  instrumentId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  route: VerificationRoute | null;
  priority: Priority;
  targetCertificateId: string | null;
  requestedChanges: Record<string, unknown> | null;
  preferredStartAt: string | null;
  preferredEndAt: string | null;
  submittedAt: string | null;
}

export interface UpdateApplicationData {
  status?: ApplicationStatus;
  priority?: Priority;
  preferredStartAt?: string | null;
  preferredEndAt?: string | null;
  submittedAt?: string | null;
}

export interface CreateStatusHistoryData {
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedById: string | null;
  reason: string | null;
}

export const applicationsRepository = {
  findById(id: string, orm: Orm = db.orm) {
    return orm.public.Application.first({ id });
  },

  findOpenForInstrument(instrumentId: string, orm: Orm = db.orm) {
    return orm.public.Application.where({ instrumentId }).all();
  },

  create(data: CreateApplicationData, orm: Orm = db.orm) {
    return orm.public.Application.create({
      ...data,
      requestedChanges: data.requestedChanges as never,
    });
  },

  update(id: string, data: UpdateApplicationData, orm: Orm = db.orm) {
    return orm.public.Application.where({ id }).update(data);
  },

  createStatusHistory(data: CreateStatusHistoryData, orm: Orm = db.orm) {
    return orm.public.ApplicationStatusHistory.create(data);
  },
};
