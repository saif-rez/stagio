import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/features/admin";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/admin")({
  head: () =>
    pageHead(
      "Administration et modération",
      "Gérez les entreprises, les attestations et la modération Stagio.",
    ),
  component: AdminPage,
});
