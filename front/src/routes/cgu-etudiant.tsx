import { createFileRoute } from "@tanstack/react-router";
import { StudentTermsPage } from "@/features/legal";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/cgu-etudiant")({
  head: () =>
    pageHead("CGU étudiant", "Conditions générales d’utilisation de Stagio pour les étudiants."),
  component: StudentTermsPage,
});
