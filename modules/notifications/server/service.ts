import { notificationsRepository, NotificationRecord } from "./repository";
import {
  ListNotificationsInput,
  ListNotificationsOutput,
  MarkNotificationReadInput,
  MarkNotificationReadOutput,
  NotificationOutput,
} from "../schema";

function toSafeNotificationOutput(rec: NotificationRecord): NotificationOutput {
  return {
    id: rec.id,
    userId: rec.userId,
    type: rec.type as any,
    title: rec.title,
    message: rec.message,
    linkUrl: rec.linkUrl ?? null,
    isRead: rec.isRead,
    createdAt: rec.createdAt.toISOString(),
  };
}

export const notificationsService = {
  async listMine(
    input: ListNotificationsInput,
    userId = "usr_demo"
  ): Promise<ListNotificationsOutput> {
    const mock: NotificationRecord = {
      id: "notif_demo_1",
      userId,
      type: "CERTIFICATE_ISSUED",
      title: "Verification Certificate Issued",
      message: "Certificate CERT-DL-2024-0042 has been issued for instrument IND-DL-NAWI-2024-0089.",
      linkUrl: "/certificates/cert_demo_1",
      isRead: false,
      createdAt: new Date(),
    };

    return {
      items: [toSafeNotificationOutput(mock)],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
      unreadCount: 1,
    };
  },

  async markRead(input: MarkNotificationReadInput, userId = "usr_demo"): Promise<MarkNotificationReadOutput> {
    await notificationsRepository.markAsRead(input.id, userId);
    return {
      success: true,
      id: input.id,
      isRead: true,
    };
  },
};
