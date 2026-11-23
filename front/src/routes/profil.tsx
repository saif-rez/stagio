import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/student";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/profil")({
  head: () => pageHead("Mon profil", "Gérez vos avis et vos demandes de contact."),
  component: ProfilePage,
});
