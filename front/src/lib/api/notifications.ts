import type { Notification, Paginated } from "@/types";
import { api } from "./client";

export const listNotifications = () =>
  api<Paginated<Notification>>("/notifications", { query: { limit: 50 } });

export const markNotificationRead = (id: string) =>
  api(`/notifications/${id}/read`, { method: "POST" });

export const markAllNotificationsRead = () => api("/notifications/read-all", { method: "POST" });
