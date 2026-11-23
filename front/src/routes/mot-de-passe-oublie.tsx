import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/features/auth";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => pageHead("Mot de passe oublié", "Réinitialisez votre mot de passe Stagio."),
  component: ForgotPasswordPage,
});
