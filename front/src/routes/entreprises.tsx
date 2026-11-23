import { createFileRoute } from "@tanstack/react-router";
import { CompaniesPage } from "@/features/catalog";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/entreprises")({
  head: () =>
    pageHead(
      "Entreprises",
      "Découvrez les entreprises et les expériences de stage vérifiées de la communauté ISGB.",
    ),
  component: CompaniesPage,
});
