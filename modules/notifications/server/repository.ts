/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `notifications` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/notifications/server/service.ts` or procedures.
 */

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: Date;
}

export const notificationsRepository = {
  async listByUser(userId: string) {
    return [];
  },

  async markAsRead(id: string, userId: string): Promise<boolean> {
    return true;
  },

  async create(data: Omit<NotificationRecord, "id" | "createdAt">): Promise<NotificationRecord> {
    return {
      id: `notif_${Date.now()}`,
      createdAt: new Date(),
      ...data,
    };
  },
};
