// Company workspace: dashboard, offers, reviews received (reply + report only).
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Eye, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge, PageHeading, ReviewCard } from "@/components/stagio/shared";
import { ErrorState, LoadingState, RequireRole } from "@/components/stagio/session";
import {
  createCompanyOffer,
  createExternalOffer,
  errorMessage,
  getCompanyDashboard,
  listCompanies,
  listCompanyOffers,
  listReceivedReviews,
  updateCompanyOffer,
} from "@/lib/api";
import { CITIES, DOMAINS, internshipTypeLabel } from "@/lib/rules";
import type { ApplicationMode, InternshipType, Session } from "@/types";

const companyLinks = [
  { to: "/entreprise", title: "Tableau de bord" },
  { to: "/entreprise/offres", title: "Mes offres" },
  { to: "/entreprise/avis", title: "Avis reçus" },
] as const;

export function CompanyNav() {
  const { pathname } = useLocation();
  return (
    <nav className="workspace-nav">
      {companyLinks.map((n) => (
        <Link to={n.to} key={n.to} className={pathname === n.to ? "active" : ""}>
          {n.title}
        </Link>
      ))}
    </nav>
  );
}

/** Company pages need a validated account linked to a company page. */
function CompanyGate({ children }: { children: () => ReactNode }) {
  return (
    <RequireRole role="COMPANY">
      {(session) => (session.user.companyId ? children() : <PendingAccount session={session} />)}
    </RequireRole>
  );
}

function PendingAccount({ session }: { session: Session }) {
  const status = session.companyAccount?.status;
  return (
    <div className="page-container max-w-2xl">
      <PageHeading eyebrow="Espace entreprise" title={`Bonjour ${session.user.name}`} />
      <div className={`account-banner ${status === "REFUSED" ? "" : "pending"}`}>
        <Clock size={18} />
        <strong>{status === "REFUSED" ? "Demande refusée" : "En attente de validation"}</strong>
        <span>
          {status === "REFUSED"
            ? "Votre matricule fiscal / RNE n’a pas pu être vérifié. Contactez l’équipe Stagio."
            : `Votre demande pour ${session.companyAccount?.company.name ?? "votre entreprise"} est en cours de vérification par l’équipe Stagio. Vous recevrez un email dès la validation.`}
        </span>
      </div>
    </div>
  );
}

// ---------- Offer form (company offers, or external offers created by the admin) ----------

export function OfferForm({
  open,
  onClose,
  external = false,
}: {
  open: boolean;
  onClose: () => void;
  external?: boolean;
}) {
  const qc = useQueryClient();
  const empty = {
    title: "",
    description: "",
    domain: DOMAINS[0] as string,
    type: "PFE" as InternshipType,
    city: "Tunis",
    mode: "LINK" as ApplicationMode,
    application: "",
    companyId: "",
    sourceName: "",
    sourceUrl: "",
    sponsoring: false,
  };
  const [f, setF] = useState(empty);
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) =>
    setF((x) => ({ ...x, [k]: v }));
  const companies = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => listCompanies({ limit: 100 }),
    enabled: open && external,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const base = {
        title: f.title.trim(),
        description: f.description.trim(),
        city: f.city.trim(),
        type: f.type,
        domain: f.domain,
        applicationMode: f.mode,
        ...(f.mode === "LINK"
          ? { applicationUrl: f.application.trim() }
          : { applicationEmail: f.application.trim() }),
      };
      return external
        ? createExternalOffer({
            ...base,
            companyId: f.companyId,
            sourceName: f.sourceName.trim(),
            ...(f.sourceUrl.trim() ? { sourceUrl: f.sourceUrl.trim() } : {}),
          })
        : createCompanyOffer({ ...base, requestSponsoring: f.sponsoring });
    },
    onSuccess: () => {
      toast.success(
        external
          ? "Offre externe publiée"
          : f.sponsoring
            ? "Offre publiée · Demande de sponsoring transmise"
            : "Votre offre a été publiée",
      );
      setF(empty);
      onClose();
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (external && !f.companyId) return void toast.error("Choisissez l’entreprise.");
    if (f.description.trim().length < 20)
      return void toast.error("La description doit contenir au moins 20 caractères.");
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{external ? "Publier une offre externe" : "Publier une offre"}</DialogTitle>
          <DialogDescription>
            {external
              ? "Offre issue de LinkedIn, Tanitjobs, de l’affichage à la fac ou d’un professeur, avec sa source."
              : "Présentez une opportunité à la communauté ISGB."}
          </DialogDescription>
        </DialogHeader>
        <form className="form-stack" onSubmit={submit}>
          <label className="form-field">
            Titre de l’offre
            <Input
              required
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex. Développeur Full Stack — PFE"
            />
          </label>
          {external && (
            <label className="form-field">
              Entreprise
              <select
                className="form-select"
                value={f.companyId}
                onChange={(e) => set("companyId", e.target.value)}
              >
                <option value="">Choisir…</option>
                {companies.data?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="form-field">
            Description
            <Textarea
              required
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Missions, profil recherché, durée…"
            />
          </label>
          <div className="form-grid">
            <label className="form-field">
              Domaine
              <select
                className="form-select"
                value={f.domain}
                onChange={(e) => set("domain", e.target.value)}
              >
                {DOMAINS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Type
              <select
                className="form-select"
                value={f.type}
                onChange={(e) => set("type", e.target.value === "SUMMER" ? "SUMMER" : "PFE")}
              >
                <option value="PFE">PFE</option>
                <option value="SUMMER">Stage d’été</option>
              </select>
            </label>
          </div>
          <label className="form-field">
            Ville
            <Input
              required
              list="stagio-cities"
              value={f.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <datalist id="stagio-cities">
              {CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="form-field">
            Candidature
            <select
              className="form-select"
              value={f.mode}
              onChange={(e) => set("mode", e.target.value === "EMAIL" ? "EMAIL" : "LINK")}
            >
              <option value="LINK">Lien externe</option>
              <option value="EMAIL">Email (le client mail s’ouvre avec l’objet pré-rempli)</option>
            </select>
          </label>
          <label className="form-field">
            {f.mode === "EMAIL" ? "Adresse email de candidature" : "Lien de candidature"}
            <Input
              required
              type={f.mode === "EMAIL" ? "email" : "url"}
              value={f.application}
              onChange={(e) => set("application", e.target.value)}
              placeholder={f.mode === "EMAIL" ? "recrutement@entreprise.tn" : "https://…"}
            />
          </label>
          {external ? (
            <div className="form-grid">
              <label className="form-field">
                Source
                <Input
                  required
                  value={f.sourceName}
                  onChange={(e) => set("sourceName", e.target.value)}
                  placeholder="LinkedIn, Tanitjobs, Affichage ISGB…"
                />
              </label>
              <label className="form-field">
                Lien d’origine (facultatif)
                <Input
                  type="url"
                  value={f.sourceUrl}
                  onChange={(e) => set("sourceUrl", e.target.value)}
                  placeholder="https://…"
                />
              </label>
            </div>
          ) : (
            <label className="switch-row">
              Demander le sponsoring (gratuit pendant la beta)
              <Switch checked={f.sponsoring} onCheckedChange={(v) => set("sponsoring", v)} />
            </label>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            <Plus />
            Publier
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Pages ----------

export function CompanyDashboard() {
  return <CompanyGate>{() => <Dashboard />}</CompanyGate>;
}

function Dashboard() {
  const dash = useQuery({ queryKey: ["company-dashboard"], queryFn: getCompanyDashboard });
  const reviews = useQuery({
    queryKey: ["company-reviews-received"],
    queryFn: () => listReceivedReviews(),
  });
  if (dash.isPending) return <LoadingState />;
  if (dash.error || !dash.data) return <ErrorState error={dash.error} />;
  const { company, stats } = dash.data;
  return (
    <div className="page-container">
      <CompanyNav />
      <PageHeading
        eyebrow="Espace entreprise"
        title={`Bonjour, l’équipe ${company.name} 👋`}
        description="Un aperçu de vos opportunités et des expériences de vos stagiaires."
      />
      <div className="account-banner">
        <ShieldCheck size={18} />
        <strong>Compte validé</strong>
        <span>
          Votre entreprise fait partie de la communauté Stagio. Vous pouvez répondre aux avis (une
          réponse publique par avis) ou les signaler, mais pas les modifier ni les supprimer.
        </span>
      </div>
      <div className="kpi-grid">
        {(
          [
            ["Offres actives", stats.activeOffers],
            ["Vues des offres", stats.offerViews.toLocaleString("fr-FR")],
            ["Avis reçus", stats.reviews],
            ["Réponses publiées", stats.replies],
          ] as const
        ).map(([label, value]) => (
          <div className="kpi-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="kpi-card mb-8">
        <p>Note moyenne</p>
        <strong>
          {stats.rating.average !== null ? (
            <>
              {stats.rating.average.toFixed(1)}
              <span className="text-sm text-muted-foreground"> / 5</span>
            </>
          ) : (
            <span className="text-base text-muted-foreground">
              Pas encore assez d’avis (3 minimum)
            </span>
          )}
        </strong>
      </div>
      <div className="section-heading">
        <h2>Les derniers avis</h2>
        <Link to="/entreprise/avis">Voir tous les avis</Link>
      </div>
      <div className="review-grid">
        {reviews.data?.items.slice(0, 2).map((r) => (
          <ReviewCard key={r.id} review={r} companyMode />
        ))}
        {reviews.data && !reviews.data.items.length && (
          <p className="text-muted-foreground">Aucun avis pour l’instant.</p>
        )}
      </div>
    </div>
  );
}

export function CompanyOffers() {
  return <CompanyGate>{() => <Offers />}</CompanyGate>;
}

function Offers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, error, isPending } = useQuery({
    queryKey: ["company-offers"],
    queryFn: listCompanyOffers,
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; active?: boolean; requestSponsoring?: boolean }) =>
      updateCompanyOffer(v.id, v),
    onSuccess: () => {
      toast.success("Offre mise à jour");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const list = (data?.items ?? []).filter((o) =>
    o.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page-container">
      <CompanyNav />
      <PageHeading
        eyebrow="Espace entreprise"
        title="Mes offres"
        description="Les opportunités que vous partagez avec les étudiants ISGB."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Publier une offre
          </Button>
        }
      />
      <div className="search-field table-search">
        <Search />
        <Input
          aria-label="Rechercher mes offres"
          placeholder="Rechercher une offre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <ErrorState error={error} />}
      {isPending ? (
        <LoadingState />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Offre</th>
                <th>Type</th>
                <th>Vues</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.title}</strong>
                    <p>
                      {o.domain} · {o.city}
                    </p>
                  </td>
                  <td>{internshipTypeLabel[o.type]}</td>
                  <td>{o.views ?? 0}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={o.active ? "green" : "muted"}>
                        {o.active ? "Active" : "Désactivée"}
                      </Badge>
                      {o.sponsored && <Badge tone="amber">Sponsorisé</Badge>}
                      {!o.sponsored && o.sponsorRequested && (
                        <Badge tone="muted">Sponsoring demandé</Badge>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      {o.active && (
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            to="/offres/$id"
                            params={{ id: o.id }}
                            aria-label={`Consulter ${o.title}`}
                          >
                            <Eye />
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: o.id, active: !o.active })}
                      >
                        {o.active ? "Désactiver" : "Réactiver"}
                      </Button>
                      {!o.sponsored && !o.sponsorRequested && o.active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: o.id, requestSponsoring: true })}
                        >
                          Demander le sponsoring
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={5}>Aucune offre pour l’instant.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <OfferForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export function CompanyReviews() {
  return <CompanyGate>{() => <Reviews />}</CompanyGate>;
}

function Reviews() {
  const [search, setSearch] = useState("");
  const { data, error, isPending } = useQuery({
    queryKey: ["company-reviews-received"],
    queryFn: () => listReceivedReviews(),
  });
  const list = (data?.items ?? []).filter((r) =>
    `${r.authorName} ${r.comment}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page-container">
      <CompanyNav />
      <PageHeading
        eyebrow="Espace entreprise"
        title="Les avis de vos stagiaires"
        description="Écoutez leurs expériences et apportez votre réponse publique (une par avis)."
      />
      <div className="search-field table-search">
        <Search />
        <Input
          aria-label="Rechercher les avis"
          placeholder="Rechercher un avis…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <ErrorState error={error} />}
      {isPending && <LoadingState />}
      <div className="flex flex-col gap-5 max-w-4xl">
        {list.map((r) => (
          <ReviewCard key={r.id} review={r} companyMode />
        ))}
        {data && !list.length && <p className="text-muted-foreground">Aucun avis.</p>}
      </div>
    </div>
  );
}
