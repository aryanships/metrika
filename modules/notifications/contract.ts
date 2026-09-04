import { base } from "@/contracts/base";
import {
  ListNotificationsInputSchema,
  ListNotificationsOutputSchema,
  MarkNotificationReadInputSchema,
  MarkNotificationReadOutputSchema,
} from "./schema";

export const listMineNotificationsContract = base
  .route({
    method: "GET",
    path: "/notifications/mine",
    summary: "List user notifications",
    description: "Retrieves unread and historical in-app notifications for the current authenticated user.",
    tags: ["Notifications"],
  })
  .input(ListNotificationsInputSchema)
  .output(ListNotificationsOutputSchema);

export const markReadContract = base
  .route({
    method: "POST",
    path: "/notifications/{id}/read",
    summary: "Mark notification as read",
    description: "Marks a specific notification as read by the recipient.",
    tags: ["Notifications"],
  })
  .input(MarkNotificationReadInputSchema)
  .output(MarkNotificationReadOutputSchema);

export const notificationsContract = {
  listMine: listMineNotificationsContract,
  markRead: markReadContract,
};
