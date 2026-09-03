import { z } from "zod";
import { PaginationInputSchema, PaginationMetaSchema } from "@/schemas/shared";

export const NotificationTypeSchema = z.enum([
  "APPLICATION_STATUS",
  "APPOINTMENT_SCHEDULED",
  "CERTIFICATE_ISSUED",
  "CERTIFICATE_EXPIRING_90",
  "CERTIFICATE_EXPIRING_60",
  "CERTIFICATE_EXPIRING_30",
  "CERTIFICATE_EXPIRED",
  "SYSTEM_ANNOUNCEMENT",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  linkUrl: z.string().nullable().optional(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type NotificationOutput = z.infer<typeof NotificationOutputSchema>;

export const ListNotificationsInputSchema = PaginationInputSchema.extend({
  unreadOnly: z.boolean().optional().default(false),
});
export type ListNotificationsInput = z.infer<typeof ListNotificationsInputSchema>;

export const ListNotificationsOutputSchema = z.object({
  items: z.array(NotificationOutputSchema),
  pagination: PaginationMetaSchema,
  unreadCount: z.number().int(),
});
export type ListNotificationsOutput = z.infer<typeof ListNotificationsOutputSchema>;

export const MarkNotificationReadInputSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
});
export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadInputSchema>;

export const MarkNotificationReadOutputSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  isRead: z.boolean(),
});
export type MarkNotificationReadOutput = z.infer<typeof MarkNotificationReadOutputSchema>;
