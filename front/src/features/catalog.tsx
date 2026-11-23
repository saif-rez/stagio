// Public pages: offers and companies.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Badge,
  EmptyState,
  FilterBar,
  Logo,
  OfferCard,
  PageHeading,
  Pager,
  RatingInline,
  RatingStars,
  ReviewCard,
  emptyFilters,
  useDebounced,
} from "@/components/stagio/shared";
import { ErrorState, LoadingState } from "@/components/stagio/session";
import { getCompany, getOffer, listCompanies, listCompanyReviews, listOffers } from "@/lib/api";
import { criteria, internshipTypeLabel } from "@/lib/rules";

export function OffersPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState<"recent" | "rating">("recent");
  const [page, setPage] = useState(1);
  const search = useDebounced(filters.search);
  const query = { ...filters, search, sort, page, limit: 12 };
  const { data, error, isPending } = useQuery({
    queryKey: ["offers", query],
    queryFn: () => listOffers(query),
    placeholderData: (prev) => prev,
  });
  return (
    <div className="page-container">
      <PageHeading
        eyebrow="Votre prochain chapitre"
        title="Trouvez le stage qui vous ressemble"
        description="Des opportunités en Tunisie, éclairées par les expériences des étudiants ISGB."
      />
      <FilterBar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />
      <div className="results-line">
        <span>
          <strong>{data?.total ?? 0}</strong> offre{(data?.total ?? 0) > 1 ? "s" : ""} de stage
        </span>
        <select
          className="form-select"
          aria-label="Trier les offres"
          value={sort}
          onChange={(e) => setSort(e.target.value === "rating" ? "rating" : "recent")}
        >
          <option value="recent">Les plus récentes</option>
          <option value="rating">Les mieux notées</option>
        </select>
      </div>
      {error && <ErrorState error={error} />}
      {isPending ? (
        <LoadingState />
      ) : (
        <div className="offer-grid">
          {data?.items.map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
          {!data?.items.length && (
            <EmptyState text="Aucune offre ne correspond à votre recherche" />
          )}
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}

export function OfferDetail({ id }: { id: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: ["offer", id],
    queryFn: () => getOffer(id),
  });
  if (isPending) return <LoadingState />;
  if (error || !data)
    return (
      <div className="page-container">
        <PageHeading title="Offre introuvable" />
        <Button asChild>
          <Link to="/offres">Retour aux offres</Link>
        </Button>
      </div>
    );
  const { offer } = data;
  const rating = offer.companyRating;
  const external = offer.apply.mode === "LINK";
  return (
    <div className="page-container">
      <Link to="/offres" className="back-link">
        <ArrowLeft size={14} />
        Toutes les offres
      </Link>
      <div className="detail-layout">
        <div className="detail-body">
          <div className="flex gap-2 mb-5">
            {offer.sponsored && <Badge tone="amber">Sponsorisé</Badge>}
            <Badge>{internshipTypeLabel[offer.type]}</Badge>
            <Badge tone="muted">{offer.domain}</Badge>
          </div>
          <PageHeading title={offer.title} description={`${offer.company.name} · ${offer.city}`} />
          <h2>À propos du stage</h2>
          <p className="whitespace-pre-line">{offer.description}</p>
          {offer.source && (
            <p className="mt-4">
              Source : {offer.source.name ?? "lien externe"}
              {offer.source.url && (
                <>
                  {" · "}
                  <a
                    href={offer.source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline"
                  >
                    Consulter l’offre originale
                  </a>
                </>
              )}
            </p>
          )}
          {offer.apply.url && (
            <Button asChild size="lg" className="mt-6">
              <a
                href={offer.apply.url}
                target={external ? "_blank" : undefined}
                rel="noreferrer noopener"
              >
                Postuler
                <ArrowUpRight />
              </a>
            </Button>
          )}
        </div>
        <aside className="detail-aside">
          <Logo name={offer.company.name} large />
          <h3>{offer.company.name}</h3>
          <p>
            {offer.company.sector} · {offer.company.city}
          </p>
          <div className="mt-5">
            {rating?.average != null ? (
              <div className="flex gap-2 items-center">
                <RatingStars value={rating.average} />
                <strong>{rating.average.toFixed(1)}/5</strong>
                <span className="text-xs text-muted-foreground">({rating.count} avis)</span>
              </div>
            ) : (
              <p>Pas encore assez d’avis</p>
            )}
          </div>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/entreprises/$id" params={{ id: offer.company.id }}>
              Découvrir les avis
              <ArrowRight />
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, error, isPending } = useQuery({
    queryKey: ["companies", q, page],
    queryFn: () => listCompanies({ search: q, page, limit: 24 }),
    placeholderData: (prev) => prev,
  });
  return (
    <div className="page-container">
      <PageHeading
        eyebrow="Des expériences, pas des suppositions"
        title="Découvrez votre future entreprise"
        description="Explorez les entreprises et les avis vérifiés de la communauté ISGB."
      />
      <div className="search-field mb-6">
        <Search />
        <Input
          aria-label="Rechercher une entreprise"
          placeholder="Une entreprise, un secteur, une ville…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {error && <ErrorState error={error} />}
      <p className="text-xs text-muted-foreground mb-5">{data?.total ?? 0} entreprises</p>
      {isPending ? (
        <LoadingState />
      ) : (
        <div className="company-grid">
          {data?.items.map((c) => (
            <Link to="/entreprises/$id" params={{ id: c.id }} key={c.id} className="company-card">
              <div className="flex justify-between">
                <Logo name={c.name} />
                <ArrowUpRight size={18} className="text-muted-foreground" />
              </div>
              <h2>{c.name}</h2>
              <p>{c.sector}</p>
              <p>{c.city}</p>
              <div className="mt-5">
                {c.rating.average !== null ? (
                  <div className="flex items-center gap-2">
                    <RatingStars value={c.rating.average} small />
                    <strong className="text-xs">{c.rating.average.toFixed(1)}</strong>
                    <span className="text-xs text-muted-foreground">· {c.rating.count} avis</span>
                  </div>
                ) : (
                  <p>Pas encore assez d’avis</p>
                )}
              </div>
            </Link>
          ))}
          {!data?.items.length && <EmptyState text="Aucune entreprise trouvée" />}
        </div>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />}
    </div>
  );
}

export function CompanyDetail({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const company = useQuery({ queryKey: ["company", id], queryFn: () => getCompany(id) });
  const reviews = useQuery({
    queryKey: ["company-reviews", id, page],
    queryFn: () => listCompanyReviews(id, page),
    placeholderData: (prev) => prev,
  });
  if (company.isPending) return <LoadingState />;
  if (company.error || !company.data)
    return (
      <div className="page-container">
        <PageHeading title="Entreprise introuvable" />
        <Button asChild>
          <Link to="/entreprises">Toutes les entreprises</Link>
        </Button>
      </div>
    );
  const c = company.data.company;
  const rating = c.rating;
  return (
    <div className="page-container">
      <Link to="/entreprises" className="back-link">
        <ArrowLeft size={14} />
        Toutes les entreprises
      </Link>
      <div className="company-header">
        <Logo name={c.name} large />
        <div>
          <h1>{c.name}</h1>
          <p>
            {c.sector} · {c.city}
          </p>
        </div>
        <div className="ml-auto">
          {rating.average !== null && (
            <>
              <strong className="text-2xl text-primary">
                {rating.average.toFixed(1)}
                <span className="text-sm text-muted-foreground">/5</span>
              </strong>
              <div className="mt-2">
                <RatingStars value={rating.average} small />
              </div>
            </>
          )}
        </div>
      </div>
      {c.description && (
        <p className="text-muted-foreground leading-7 mb-6 max-w-3xl">{c.description}</p>
      )}
      {rating.criteria ? (
        <div className="criteria-summary">
          {criteria.map((cr) => (
            <div key={cr.key}>
              <p>{cr.label}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <strong>{rating.criteria![cr.key].toFixed(1)}</strong>
                <RatingStars value={rating.criteria![cr.key]} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="account-banner pending mb-7">
          Pas encore assez d’avis. Les notes moyennes apparaissent à partir de 3 avis.
        </div>
      )}
      <div className="detail-layout">
        <section>
          <div className="section-heading">
            <h2>Les expériences des étudiants</h2>
            <span className="text-xs text-muted-foreground">{reviews.data?.total ?? 0} avis</span>
          </div>
          <div className="company-detail-reviews">
            {reviews.data?.items.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
            {reviews.data && !reviews.data.items.length && (
              <p className="text-muted-foreground">
                Soyez le premier à partager votre expérience.{" "}
                <Link to="/mes-stages" className="text-primary font-medium">
                  Déclarer un stage
                </Link>
              </p>
            )}
          </div>
          {reviews.data && (
            <Pager page={reviews.data.page} totalPages={reviews.data.totalPages} onPage={setPage} />
          )}
        </section>
        <aside>
          <h2 className="text-lg font-semibold mb-5">Stages chez {c.name}</h2>
          <div className="flex flex-col gap-5">
            {company.data.offers.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
            {!company.data.offers.length && (
              <p className="text-sm text-muted-foreground">Aucune offre en ce moment.</p>
            )}
          </div>
          <div className="mt-6">
            <RatingInline rating={rating} />
          </div>
        </aside>
      </div>
    </div>
  );
}
