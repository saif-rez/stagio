import { createFileRoute } from "@tanstack/react-router";
import { CompanyTermsPage } from "@/features/legal";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/cgu-entreprise")({
  head: () =>
    pageHead(
      "CGU entreprise",
      "Conditions générales d’utilisation de Stagio pour les entreprises.",
    ),
  component: CompanyTermsPage,
});
