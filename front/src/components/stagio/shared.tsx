import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Flag,
  MapPin,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage, replyToReview, reportReview, sendContactRequest } from "@/lib/api";
import {
  CITIES,
  CONTACT_MESSAGE_MAX,
  criteria,
  DOMAINS,
  internshipTypeLabel,
  moderateText,
  reportReasonLabel,
  reviewStatusLabel,
  validContact,
} from "@/lib/rules";
import type { Offer, RatingSummary, ReportReason, Review } from "@/types";
import { useSession } from "./session";

const tones = ["blue", "red", "orange", "green", "violet"];

/** Initials + color derived from the company name (no logo upload in the MVP). */
export function Logo({ name, large = false }: { name: string; large?: boolean }) {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (
    words.length > 1 ? words[0]![0]! + words[1]![0]! : name.slice(0, 1)
  ).toUpperCase();
  const tone = tones[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length];
  return <div className={`company-logo tone-${tone} ${large ? "large" : ""}`}>{initials}</div>;
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: string }) {
  return <span className={`status-badge badge-${tone}`}>{children}</span>;
}

export function RatingStars({
  value,
  onChange,
  small = false,
}: {
  value: number;
  onChange?: (n: number) => void;
  small?: boolean;
}) {
  return (
    <span className={`stars ${small ? "small" : ""}`} aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <Button
            key={n}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
          >
            <Star className={n <= value ? "filled" : "empty"} />
          </Button>
        ) : (
          <Star key={n} className={n <= Math.round(value) ? "filled" : "empty"} />
        ),
      )}
    </span>
  );
}

/** Company average, or "Pas encore assez d'avis" below 3 reviews. */
export function RatingInline({ rating }: { rating: RatingSummary | null | undefined }) {
  if (!rating || rating.average === null)
    return <span className="text-xs text-muted-foreground">Pas encore assez d’avis</span>;
  return (
    <span className="rating-inline">
      <Star className="filled" />
      {rating.average.toFixed(1)} <span>({rating.count} avis)</span>
    </span>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function OfferCard({ offer }: { offer: Offer }) {
  return (
    <article className="offer-card">
      <div className="flex items-start justify-between gap-2">
        <Logo name={offer.company.name} />
        {offer.sponsored && <Badge tone="amber">Sponsorisé</Badge>}
      </div>
      <p className="company-name">{offer.company.name}</p>
      <Link to="/offres/$id" params={{ id: offer.id }} className="offer-title">
        {offer.title}
      </Link>
      <div className="offer-meta">
        <span>
          <MapPin />
          {offer.city}
        </span>
        <span>
          <BriefcaseBusiness />
          {internshipTypeLabel[offer.type]}
        </span>
      </div>
      <div className="offer-card-bottom">
        <RatingInline rating={offer.companyRating} />
        <Link to="/offres/$id" params={{ id: offer.id }} aria-label={`Voir ${offer.title}`}>
          <ArrowUpRight size={19} />
        </Link>
      </div>
    </article>
  );
}

type Modal = "contact" | "report" | "reply" | null;

/**
 * A review. `companyMode` = seen by the company it is about (reply + report).
 * Companies can never edit, hide or delete a review.
 */
export function ReviewCard({
  review,
  companyMode = false,
}: {
  review: Review;
  companyMode?: boolean;
}) {
  const { session } = useSession();
  const qc = useQueryClient();
  const [modal, setModal] = useState<Modal>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<ReportReason>("FAKE_REVIEW");

  const isVerifiedStudent = session?.user.role === "STUDENT" && session.user.emailVerified;
  const canContact = !companyMode && review.contactOptIn && !review.isMine;
  const canReport = companyMode || (!review.isMine && session?.user.role !== "ADMIN");

  const mutation = useMutation({
    mutationFn: async () => {
      if (modal === "contact") return sendContactRequest(review.id, message.trim());
      if (modal === "reply") return replyToReview(review.id, message.trim());
      return reportReview(review.id, reason);
    },
    onSuccess: () => {
      toast.success(
        modal === "contact"
          ? "Votre demande de contact a été envoyée"
          : modal === "reply"
            ? "Votre réponse publique a été publiée"
            : "Votre signalement a été transmis",
      );
      setModal(null);
      setMessage("");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function open(next: Exclude<Modal, null>) {
    if (!companyMode && !isVerifiedStudent) {
      toast.error("Connectez-vous avec un compte étudiant vérifié pour continuer.");
      return;
    }
    setModal(next);
  }

  function submit() {
    if (modal === "contact" && !validContact(message)) return;
    if (modal === "reply") {
      const blocked = moderateText(message);
      if (blocked) return void toast.error(blocked);
    }
    mutation.mutate();
  }

  return (
    <article className="review-card">
      <div className="review-top">
        <div className="flex items-center gap-3">
          <div className="avatar">
            {review.anonymous ? (
              <ShieldCheck size={20} />
            ) : (
              review.authorName
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")
            )}
          </div>
          <div>
            <strong>{review.authorName}</strong>
            <p className="text-xs text-muted-foreground mt-1">
              {internshipTypeLabel[review.type]} · {review.year} · {review.company.name}
            </p>
          </div>
        </div>
        <Badge>
          <ShieldCheck size={12} />
          Avis vérifié
        </Badge>
      </div>
      {review.status && review.status !== "PUBLISHED" && (
        <div className="account-banner pending mb-3">{reviewStatusLabel[review.status]}</div>
      )}
      <div className="review-ratings">
        {criteria.map((c) => (
          <div key={c.key}>
            <span>{c.label}</span>
            <RatingStars value={review.ratings[c.key]} small />
          </div>
        ))}
      </div>
      <p className="review-comment">{review.comment}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {review.badges.verifiedInternship ? (
          <Badge tone="green">
            <ShieldCheck size={12} />
            Stage vérifié
          </Badge>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {canContact && (
            <Button variant="ghost" size="sm" onClick={() => open("contact")}>
              <MessageCircle />
              Demander un contact
            </Button>
          )}
          {companyMode && !review.reply && (
            <Button variant="outline" size="sm" onClick={() => setModal("reply")}>
              <MessageCircle />
              Répondre
            </Button>
          )}
          {canReport && (
            <Button variant="ghost" size="sm" onClick={() => open("report")}>
              <Flag />
              Signaler
            </Button>
          )}
        </div>
      </div>
      {review.reply && (
        <div className="company-reply">
          <strong>Réponse de l’entreprise</strong>
          <p>{review.reply.body}</p>
        </div>
      )}
      <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal === "contact"
                ? "Demander un contact"
                : modal === "reply"
                  ? "Répondre à cet avis"
                  : "Signaler cet avis"}
            </DialogTitle>
            <DialogDescription>
              {modal === "contact"
                ? "L’ancien(ne) stagiaire accepte ou refuse. Ses coordonnées ne sont partagées qu’en cas d’accord (5 demandes par jour maximum)."
                : modal === "reply"
                  ? "Votre réponse sera publique. Une seule réponse est autorisée par avis."
                  : "Choisissez le motif de votre signalement. L’avis est examiné par la modération."}
            </DialogDescription>
          </DialogHeader>
          {modal === "report" ? (
            <select
              className="form-select"
              aria-label="Motif du signalement"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
            >
              {(Object.keys(reportReasonLabel) as ReportReason[]).map((r) => (
                <option key={r} value={r}>
                  {reportReasonLabel[r]}
                </option>
              ))}
            </select>
          ) : (
            <>
              <Textarea
                aria-label="Votre message"
                placeholder={
                  modal === "contact" ? "Bonjour, j’aimerais en savoir plus sur…" : "Votre réponse…"
                }
                value={message}
                maxLength={modal === "contact" ? CONTACT_MESSAGE_MAX : 2000}
                onChange={(e) => setMessage(e.target.value)}
              />
              {modal === "contact" && (
                <p className="text-right text-xs text-muted-foreground">
                  {message.length}/{CONTACT_MESSAGE_MAX}
                </p>
              )}
            </>
          )}
          <Button
            onClick={submit}
            disabled={mutation.isPending || (modal !== "report" && !message.trim())}
          >
            <Send />
            Envoyer
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export type Filters = {
  search: string;
  domain: string;
  type: "" | "PFE" | "SUMMER";
  city: string;
  minRating: string;
};
export const emptyFilters: Filters = { search: "", domain: "", type: "", city: "", minRating: "" };

const filterSelects: {
  key: Exclude<keyof Filters, "search">;
  label: string;
  options: [string, string][];
}[] = [
  { key: "domain", label: "Domaine", options: DOMAINS.map((d) => [d, d]) },
  {
    key: "type",
    label: "Type de stage",
    options: [
      ["PFE", "PFE"],
      ["SUMMER", "Stage d’été"],
    ],
  },
  { key: "city", label: "Ville", options: CITIES.map((c) => [c, c]) },
  {
    key: "minRating",
    label: "Note minimale",
    options: ["3", "4", "4.5"].map((n) => [n, `${n} ★ et plus`]),
  },
];

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (v: Filters) => void;
}) {
  return (
    <div className="filter-bar">
      <div className="search-field">
        <Search />
        <Input
          aria-label="Rechercher une offre"
          placeholder="Un poste, une entreprise, un mot-clé…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="filter-selects">
        <SlidersHorizontal size={18} />
        {filterSelects.map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            className="form-select"
            value={filters[f.key]}
            onChange={(e) => onChange({ ...filters, [f.key]: e.target.value })}
          >
            <option value="">{f.label}</option>
            {f.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ))}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Réinitialiser les filtres"
          onClick={() => onChange(emptyFilters)}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  text,
  hint = "Essayez d’autres critères.",
}: {
  text: string;
  hint?: string;
}) {
  return (
    <div className="empty-state">
      <Search size={28} />
      <h3>{text}</h3>
      <p>{hint}</p>
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Précédent
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Suivant
      </Button>
    </div>
  );
}

/** Debounced value, to avoid one API call per keystroke in search fields. */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
