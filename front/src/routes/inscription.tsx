import { createFileRoute } from "@tanstack/react-router";
import { SignupPage } from "@/features/auth";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/inscription")({
  head: () =>
    pageHead(
      "Créer mon compte",
      "Rejoignez les étudiants ISGB sur Stagio, la communauté des stages en Tunisie.",
    ),
  component: SignupPage,
});
