import { createFileRoute } from "@tanstack/react-router";
import { CompanyReviews } from "@/features/company";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/entreprise_/avis")({
  head: () => pageHead("Avis reçus", "Les avis de vos stagiaires et vos réponses publiques."),
  component: CompanyReviews,
});
