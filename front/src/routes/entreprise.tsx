import { createFileRoute } from "@tanstack/react-router";
import { CompanyDashboard } from "@/features/company";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/entreprise")({
  head: () => pageHead("Espace entreprise", "Tableau de bord de votre entreprise sur Stagio."),
  component: CompanyDashboard,
});
