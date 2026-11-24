import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/features/legal";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/confidentialite")({
  head: () =>
    pageHead(
      "Politique de confidentialité",
      "Données collectées par Stagio, conservation et droits des utilisateurs.",
    ),
  component: PrivacyPage,
});
