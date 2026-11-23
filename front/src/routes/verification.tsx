import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VerificationPage } from "@/features/auth";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/verification")({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => pageHead("Vérification de l’email", "Saisissez le code à 6 chiffres reçu par email."),
  component: Page,
});
function Page() {
  const { email } = Route.useSearch();
  return <VerificationPage {...(email ? { initialEmail: email } : {})} />;
}
