import { createFileRoute } from "@tanstack/react-router";
import { CompanySignupPage } from "@/features/auth";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/inscription-entreprise")({
  head: () =>
    pageHead(
      "Espace entreprise",
      "Publiez vos offres de stage et répondez aux avis de vos stagiaires.",
    ),
  component: CompanySignupPage,
});
