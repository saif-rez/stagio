import { createFileRoute } from "@tanstack/react-router";
import { OffersPage } from "@/features/catalog";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/offres")({
  head: () =>
    pageHead(
      "Offres de stage",
      "Trouvez votre stage PFE ou d’été, éclairé par les avis vérifiés des étudiants ISGB.",
    ),
  component: OffersPage,
});
