import { createFileRoute } from "@tanstack/react-router";
import { CompanyDetail } from "@/features/catalog";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/entreprises_/$id")({
  head: () =>
    pageHead(
      "Avis sur l’entreprise",
      "Découvrez les opportunités et les expériences vérifiées de la communauté ISGB.",
    ),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <CompanyDetail id={id} />;
}
