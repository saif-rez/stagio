import { createFileRoute } from "@tanstack/react-router";
import { OfferDetail } from "@/features/catalog";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/offres_/$id")({
  head: () =>
    pageHead(
      "Détail du stage",
      "Découvrez les opportunités et les expériences vérifiées de la communauté ISGB.",
    ),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <OfferDetail id={id} />;
}
