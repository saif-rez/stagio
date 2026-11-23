import { createFileRoute } from "@tanstack/react-router";
import { CompanyOffers } from "@/features/company";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/entreprise_/offres")({
  head: () => pageHead("Mes offres", "Gérez les offres de stage de votre entreprise."),
  component: CompanyOffers,
});
