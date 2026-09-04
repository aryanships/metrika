import { ORPCError } from "@orpc/server";
import { db } from "@/prisma/db";
import { paginationMeta } from "@/schemas/shared";
import type { AppUser } from "@/middleware/context";
import {
  ListNotificationsInput,
  ListNotificationsOutput,
  MarkNotificationReadInput,
  MarkNotificationReadOutput,
  NotificationOutput,
} from "../schema";

type Orm = typeof db.orm.public;
type NotificationRow = NonNullable<Awaited<ReturnType<Orm["Notification"]["first"]>>>;

function titleFor(row: NotificationRow): string {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  return typeof payload.title === "string" ? payload.title : row.event.replaceAll("_", " ").toLowerCase();
}

function messageFor(row: NotificationRow): string {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  return typeof payload.message === "string" ? payload.message : "";
}

function toOutput(row: NotificationRow): NotificationOutput {
  return {
    id: row.id,
    event: row.event,
    title: titleFor(row),
    message: messageFor(row),
    certificateId: row.certificateId,
    isRead: row.readAt !== null,
    createdAt: row.createdAt,
  };
}

export const notificationsService = {
  async listMine(input: ListNotificationsInput, user: AppUser): Promise<ListNotificationsOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    let query = db.orm.public.Notification.where({ userId: user.id, channel: "IN_APP" });
    if (input.unreadOnly) query = query.where((n) => n.readAt.isNull());

    const [rows, totals, unread] = await Promise.all([
      query.orderBy((n) => n.createdAt.desc()).offset((page - 1) * limit).limit(limit).all(),
      query.aggregate((agg) => ({ total: agg.count() })),
      db.orm.public.Notification.where({ userId: user.id, channel: "IN_APP" })
        .where((n) => n.readAt.isNull())
        .aggregate((agg) => ({ total: agg.count() })),
    ]);

    return {
      items: rows.map(toOutput),
      pagination: paginationMeta(totals.total, page, limit),
      unreadCount: unread.total,
    };
  },

  async markRead(input: MarkNotificationReadInput, user: AppUser): Promise<MarkNotificationReadOutput> {
    const row = await db.orm.public.Notification.where({ id: input.id, userId: user.id }).first();
    if (!row) {
      throw new ORPCError("NOT_FOUND", { data: { resourceType: "Notification", resourceId: input.id } });
    }
    if (!row.readAt) {
      await db.orm.public.Notification.where({ id: row.id }).update({ readAt: new Date().toISOString() });
    }
    return { success: true, id: row.id, isRead: true };
  },
};
