import { createFileRoute } from "@tanstack/react-router";
import { InternshipsPage } from "@/features/student";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/mes-stages")({
  head: () => pageHead("Mes stages", "Déclarez vos stages et partagez votre expérience ISGB."),
  component: InternshipsPage,
});
