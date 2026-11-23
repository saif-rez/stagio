import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/connexion")({
  head: () => pageHead("Se connecter", "Retrouvez vos offres et vos expériences sur Stagio."),
  component: LoginPage,
});
