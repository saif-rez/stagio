import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/features/student";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/notifications")({
  head: () => pageHead("Notifications", "Vos notifications Stagio."),
  component: NotificationsPage,
});
