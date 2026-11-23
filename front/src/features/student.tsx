// Student space: declared internships, reviews, profile, contact requests, notifications.
import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
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
import { Badge, Logo, PageHeading, RatingStars, ReviewCard } from "@/components/stagio/shared";
import { ErrorState, LoadingState, RequireRole, useSession } from "@/components/stagio/session";
import {
  acceptContactRequest,
  declareInternship,
  deleteAccount,
  errorMessage,
  listCompanies,
  listContactRequests,
  listMyInternships,
  listMyReviews,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  publishReview,
  refuseContactRequest,
  updateProfile,
  updateReview,
  uploadCertificate,
  type ReviewInput,
} from "@/lib/api";
import {
  CONTACT_EXPIRY_DAYS,
  contactChannelLabel,
  contactStatusLabel,
  criteria,
  DOMAINS,
  internshipStatusLabel,
  internshipTypeLabel,
  MIN_REVIEW_LENGTH,
  moderateText,
} from "@/lib/rules";
import type {
  ContactChannel,
  ContactRequest,
  Internship,
  InternshipType,
  Ratings,
  Review,
  Session,
} from "@/types";

const statusTone = {
  VERIFIED: "green",
  PENDING_VERIFICATION: "amber",
  DECLARED: "muted",
  REJECTED: "red",
} as const;

async function withToast(setBusy: (b: boolean) => void, fn: () => Promise<void>) {
  setBusy(true);
  try {
    await fn();
  } catch (e) {
    toast.error(errorMessage(e));
  } finally {
    setBusy(false);
  }
}

// ---------- Review form (publish or edit) ----------

function ReviewForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: Review;
  submitLabel: string;
  onSubmit: (input: ReviewInput) => void;
  busy: boolean;
}) {
  const [ratings, setRatings] = useState<Ratings>(
    initial?.ratings ?? { supervision: 0, atmosphere: 0, missions: 0 },
  );
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [anonymous, setAnonymous] = useState(initial?.anonymous ?? true);
  const [contact, setContact] = useState(initial?.contactOptIn ?? false);
  const complete =
    Object.values(ratings).every((v) => v > 0) && comment.trim().length >= MIN_REVIEW_LENGTH;

  function submit() {
    const blocked = moderateText(comment);
    if (blocked) return void toast.error(blocked);
    onSubmit({ ratings, comment: comment.trim(), anonymous, contactOptIn: contact });
  }

  return (
    <div className="form-stack">
      {criteria.map((c) => (
        <div key={c.key} className="flex items-center justify-between gap-2">
          <span className="text-xs">{c.label}</span>
          <RatingStars
            value={ratings[c.key]}
            onChange={(n) => setRatings((r) => ({ ...r, [c.key]: n }))}
          />
        </div>
      ))}
      <label className="form-field">
        Votre expérience
        <Textarea
          placeholder="Ce qui vous a marqué, ce que vous avez appris… Ne citez aucune personne."
          value={comment}
          maxLength={3000}
          onChange={(e) => setComment(e.target.value)}
        />
        <span className="form-note">
          {MIN_REVIEW_LENGTH} caractères minimum. On note une expérience, jamais une personne.
        </span>
      </label>
      <label className="switch-row">
        Publier anonymement (« Étudiant(e) vérifié(e) – ISGB »)
        <Switch checked={anonymous} onCheckedChange={setAnonymous} />
      </label>
      <label className="switch-row">
        J’accepte d’être contacté(e) par d’autres étudiants
        <Switch checked={contact} onCheckedChange={setContact} />
      </label>
      <Button onClick={submit} disabled={!complete || busy}>
        {submitLabel}
        <Check />
      </Button>
    </div>
  );
}

// ---------- Declare an internship (3 steps) ----------

function DeclareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [propose, setPropose] = useState(false);
  const [proposal, setProposal] = useState({ name: "", city: "", sector: "" });
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [type, setType] = useState<InternshipType>("PFE");
  const [domain, setDomain] = useState<string>(DOMAINS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const companies = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => listCompanies({ limit: 100 }),
    enabled: open,
  });
  const filtered = (companies.data?.items ?? []).filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()),
  );

  function close() {
    setStep(1);
    setInternship(null);
    setCompanyId("");
    setPropose(false);
    setProposal({ name: "", city: "", sector: "" });
    setFile(null);
    onClose();
    void qc.invalidateQueries();
  }

  const step1Valid = propose
    ? proposal.name.trim().length >= 2 &&
      proposal.city.trim().length >= 2 &&
      proposal.sector.trim().length >= 2
    : !!companyId;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Déclarer un stage</DialogTitle>
          <DialogDescription>Une expérience partagée aide toute la communauté.</DialogDescription>
        </DialogHeader>
        <div className="step-indicator">
          {["Votre stage", "Attestation", "Votre avis"].map((s, i) => (
            <span className={step === i + 1 ? "active" : ""} key={s}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
        {step === 1 && (
          <div className="form-stack">
            {!propose ? (
              <>
                <label className="form-field">
                  Rechercher une entreprise
                  <Input
                    placeholder="Nom de l’entreprise"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                  />
                  <select
                    className="form-select"
                    aria-label="Entreprise"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                  >
                    <option value="">Choisir une entreprise…</option>
                    {filtered.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.city}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="button" variant="link" onClick={() => setPropose(true)}>
                  <Plus />
                  Mon entreprise n’est pas dans la liste
                </Button>
              </>
            ) : (
              <>
                <p className="form-note">
                  L’entreprise proposée sera vérifiée par l’équipe Stagio avant d’apparaître dans
                  l’annuaire.
                </p>
                <label className="form-field">
                  Nom de l’entreprise
                  <Input
                    value={proposal.name}
                    onChange={(e) => setProposal((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>
                <div className="form-grid">
                  <label className="form-field">
                    Ville
                    <Input
                      value={proposal.city}
                      onChange={(e) => setProposal((p) => ({ ...p, city: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    Secteur
                    <Input
                      value={proposal.sector}
                      onChange={(e) => setProposal((p) => ({ ...p, sector: e.target.value }))}
                    />
                  </label>
                </div>
                <Button type="button" variant="link" onClick={() => setPropose(false)}>
                  Choisir une entreprise existante
                </Button>
              </>
            )}
            <div className="form-grid">
              <label className="form-field">
                Année
                <Input
                  type="number"
                  min={2000}
                  max={new Date().getFullYear()}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </label>
              <label className="form-field">
                Type
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value === "SUMMER" ? "SUMMER" : "PFE")}
                >
                  <option value="PFE">PFE</option>
                  <option value="SUMMER">Stage d’été</option>
                </select>
              </label>
            </div>
            <label className="form-field">
              Domaine
              <select
                className="form-select"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                {DOMAINS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="upload-area">
            <Upload size={30} />
            <strong>Votre attestation de stage</strong>
            <p className="form-note mt-2">
              Facultatif · PDF, JPG ou PNG · 5 Mo maximum. Visible uniquement par l’équipe Stagio.
              Une fois validée, votre avis obtient le badge « Stage vérifié ».
            </p>
            <input
              aria-label="Attestation de stage"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-primary mt-3">{file.name}</p>}
          </div>
        )}
        {step === 3 && internship && (
          <ReviewForm
            submitLabel="Publier mon avis"
            busy={busy}
            onSubmit={(input) =>
              void withToast(setBusy, async () => {
                await publishReview(internship.id, input);
                toast.success("Votre avis est publié. Merci pour la communauté !");
                close();
              })
            }
          />
        )}
        <div className="flex justify-between mt-5">
          <Button variant="ghost" onClick={close}>
            {step === 1 ? (
              <>
                <ArrowLeft />
                Annuler
              </>
            ) : (
              "Terminer plus tard"
            )}
          </Button>
          {step === 1 && (
            <Button
              disabled={!step1Valid || busy}
              onClick={() =>
                void withToast(setBusy, async () => {
                  const { internship: created } = await declareInternship({
                    ...(propose ? { proposedCompany: proposal } : { companyId }),
                    year: Number(year),
                    type,
                    domain,
                  });
                  setInternship(created);
                  setStep(2);
                })
              }
            >
              Continuer
              <ArrowRight />
            </Button>
          )}
          {step === 2 && internship && (
            <Button
              disabled={busy}
              onClick={() =>
                void withToast(setBusy, async () => {
                  if (file) {
                    await uploadCertificate(internship.id, file);
                    toast.success("Attestation envoyée pour vérification");
                  }
                  setStep(3);
                })
              }
            >
              {file ? "Envoyer et continuer" : "Passer cette étape"}
              <ArrowRight />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InternshipItem({ internship }: { internship: Internship }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const review = internship.review;
  const save = useMutation({
    mutationFn: (input: ReviewInput) =>
      review ? updateReview(review.id, input) : publishReview(internship.id, input),
    onSuccess: () => {
      toast.success(review ? "Votre avis a été mis à jour" : "Votre avis est publié");
      setReviewOpen(false);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadCertificate(internship.id, file),
    onSuccess: () => {
      toast.success("Attestation envoyée pour vérification");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const canEdit =
    review && (review.status === "PUBLISHED" || review.status === "CHANGES_REQUESTED");

  return (
    <article className="internship-item flex-wrap">
      <Logo name={internship.company.name} />
      <div className="flex-1">
        {internship.company.status === "ACTIVE" ? (
          <Link to="/entreprises/$id" params={{ id: internship.company.id }}>
            <h3>{internship.company.name}</h3>
          </Link>
        ) : (
          <h3>
            {internship.company.name}{" "}
            <span className="text-xs text-muted-foreground">(en cours de validation)</span>
          </h3>
        )}
        <p>
          {internshipTypeLabel[internship.type]} · {internship.year} · {internship.domain}
        </p>
        {review?.status === "CHANGES_REQUESTED" && (
          <p className="form-error mt-1">La modération vous demande de modifier votre avis.</p>
        )}
      </div>
      <Badge tone={statusTone[internship.status]}>{internshipStatusLabel[internship.status]}</Badge>
      <div className="flex gap-2 w-full justify-end">
        {internship.status !== "VERIFIED" && (
          <>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={upload.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
              {internship.hasCertificate ? "Remplacer l’attestation" : "Joindre l’attestation"}
            </Button>
          </>
        )}
        {!review ? (
          <Button size="sm" onClick={() => setReviewOpen(true)}>
            Donner mon avis
          </Button>
        ) : (
          canEdit && (
            <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
              <Pencil />
              Modifier mon avis
            </Button>
          )
        )}
      </div>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{review ? "Modifier mon avis" : "Donner mon avis"}</DialogTitle>
            <DialogDescription>
              {internship.company.name} · {internshipTypeLabel[internship.type]} {internship.year}
            </DialogDescription>
          </DialogHeader>
          <ReviewForm
            {...(review ? { initial: review } : {})}
            submitLabel={review ? "Enregistrer" : "Publier mon avis"}
            busy={save.isPending}
            onSubmit={(input) => save.mutate(input)}
          />
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function InternshipsPage() {
  return <RequireRole role="STUDENT">{() => <Internships />}</RequireRole>;
}

function Internships() {
  const [open, setOpen] = useState(false);
  const { data, error, isPending } = useQuery({
    queryKey: ["my-internships"],
    queryFn: listMyInternships,
  });
  return (
    <div className="page-container">
      <PageHeading
        eyebrow="Votre parcours, votre impact"
        title="Mes stages"
        description="Déclarez vos stages, joignez votre attestation et partagez votre expérience. Un seul avis par stage."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Déclarer un stage
          </Button>
        }
      />
      {error && <ErrorState error={error} />}
      {isPending ? (
        <LoadingState />
      ) : (
        <div className="internship-list">
          {data?.items.map((i) => (
            <InternshipItem key={i.id} internship={i} />
          ))}
          {!data?.items.length && (
            <p className="text-muted-foreground">
              Vous n’avez encore déclaré aucun stage. Votre expérience peut aider un(e) futur(e)
              stagiaire !
            </p>
          )}
        </div>
      )}
      <DeclareDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

// ---------- Profile ----------

const contactTone = {
  PENDING: "amber",
  ACCEPTED: "green",
  REFUSED: "red",
  EXPIRED: "muted",
} as const;

function ContactItem({ c }: { c: ContactRequest }) {
  const qc = useQueryClient();
  const [accepting, setAccepting] = useState(false);
  const [channel, setChannel] = useState<ContactChannel>("EMAIL");
  const [value, setValue] = useState("");
  const done = () => {
    setAccepting(false);
    void qc.invalidateQueries();
  };
  const accept = useMutation({
    mutationFn: () => acceptContactRequest(c.id, channel, value.trim()),
    onSuccess: () => {
      toast.success("Demande acceptée : votre contact est partagé");
      done();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const refuse = useMutation({
    mutationFn: () => refuseContactRequest(c.id),
    onSuccess: () => {
      toast("Demande refusée");
      done();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <article className="contact-item">
      <div className="flex justify-between gap-3">
        <strong className="text-sm">
          {c.otherParty} · {c.review.company.name} ({internshipTypeLabel[c.review.type]}{" "}
          {c.review.year})
        </strong>
        <Badge tone={contactTone[c.status]}>{contactStatusLabel[c.status]}</Badge>
      </div>
      <p>{c.message}</p>
      {c.status === "PENDING" && c.box === "received" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAccepting(true)}>
            <Check />
            Accepter
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={refuse.isPending}
            onClick={() => refuse.mutate()}
          >
            Refuser
          </Button>
        </div>
      )}
      {c.status === "PENDING" && (
        <p className="text-xs text-muted-foreground">
          Expire le {new Date(c.expiresAt).toLocaleDateString("fr-FR")} ({CONTACT_EXPIRY_DAYS} jours
          sans réponse).
        </p>
      )}
      {c.contact && (
        <p className="text-primary">
          {contactChannelLabel[c.contact.channel]} : {c.contact.value}
        </p>
      )}
      <Dialog open={accepting} onOpenChange={setAccepting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager un contact</DialogTitle>
            <DialogDescription>
              Choisissez le moyen de contact que vous acceptez de partager avec {c.otherParty}.
            </DialogDescription>
          </DialogHeader>
          <select
            className="form-select"
            aria-label="Moyen de contact"
            value={channel}
            onChange={(e) => setChannel(e.target.value as ContactChannel)}
          >
            {(Object.keys(contactChannelLabel) as ContactChannel[]).map((k) => (
              <option key={k} value={k}>
                {contactChannelLabel[k]}
              </option>
            ))}
          </select>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              channel === "EMAIL"
                ? "votre.email@exemple.com"
                : channel === "LINKEDIN"
                  ? "https://www.linkedin.com/in/…"
                  : "+216 …"
            }
          />
          <Button disabled={!value.trim() || accept.isPending} onClick={() => accept.mutate()}>
            <Check />
            Accepter et partager
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function ProfilePage() {
  return <RequireRole role="STUDENT">{(s) => <Profile session={s} />}</RequireRole>;
}

function Profile({ session }: { session: Session }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = session.user;
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(me.name);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const reviews = useQuery({ queryKey: ["my-reviews"], queryFn: listMyReviews });
  const received = useQuery({
    queryKey: ["contacts", "received"],
    queryFn: () => listContactRequests("received"),
  });
  const sent = useQuery({
    queryKey: ["contacts", "sent"],
    queryFn: () => listContactRequests("sent"),
  });

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("Profil mis à jour");
      setEdit(false);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      toast.success("Votre compte a été supprimé. Vos avis restent en ligne, anonymisés.");
      qc.clear();
      void navigate({ to: "/" });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function toggleDomain(d: string) {
    const next = me.followedDomains.includes(d)
      ? me.followedDomains.filter((x) => x !== d)
      : [...me.followedDomains, d];
    save.mutate({ followedDomains: next });
  }

  return (
    <div className="page-container">
      <PageHeading eyebrow="Votre espace personnel" title="Mon profil" />
      <div className="profile-layout">
        <aside className="profile-card">
          <div className="avatar">
            <UserRound />
          </div>
          <h2>{me.name}</h2>
          <p>{me.email}</p>
          <Badge tone="blue">
            <ShieldCheck size={12} />
            Étudiant(e) vérifié(e) – {me.establishment?.name ?? "ISGB"}
          </Badge>
          <div className="mt-6 text-left w-full">
            <p className="text-sm font-semibold mb-2">Domaines suivis</p>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={me.followedDomains.includes(d) ? "secondary" : "outline"}
                  onClick={() => toggleDomain(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
            <label className="switch-row mt-3">
              Email quotidien des nouvelles offres
              <Switch
                checked={me.digestEnabled}
                onCheckedChange={(v) => save.mutate({ digestEnabled: v })}
              />
            </label>
          </div>
          <Button variant="outline" className="w-full mt-5" onClick={() => setEdit(true)}>
            Modifier mon nom
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-2 text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2 />
            Supprimer mon compte
          </Button>
        </aside>
        <div>
          <section className="profile-section">
            <h2>Mes avis</h2>
            {reviews.isPending && <LoadingState />}
            <div className="flex flex-col gap-4">
              {reviews.data?.items.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
              {reviews.data && !reviews.data.items.length && (
                <p className="text-muted-foreground">
                  Aucun avis pour l’instant.{" "}
                  <Link to="/mes-stages" className="text-primary font-medium">
                    Déclarer un stage
                  </Link>
                </p>
              )}
            </div>
          </section>
          <section className="profile-section">
            <h2>Demandes de contact reçues</h2>
            {received.data?.items.map((c) => (
              <ContactItem key={c.id} c={c} />
            ))}
            {received.data && !received.data.items.length && (
              <p className="text-muted-foreground">Aucune demande reçue.</p>
            )}
          </section>
          <section className="profile-section">
            <h2>Demandes envoyées</h2>
            {sent.data?.items.map((c) => (
              <ContactItem key={c.id} c={c} />
            ))}
            {sent.data && !sent.data.items.length && (
              <p className="text-muted-foreground">
                Aucune demande envoyée. Vous pouvez contacter un(e) ancien(ne) stagiaire depuis un
                avis.
              </p>
            )}
          </section>
        </div>
      </div>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier mon nom</DialogTitle>
            <DialogDescription>
              Votre nom n’apparaît jamais sur vos avis anonymes.
            </DialogDescription>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            disabled={name.trim().length < 2 || save.isPending}
            onClick={() => save.mutate({ name: name.trim() })}
          >
            Enregistrer
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer mon compte</DialogTitle>
            <DialogDescription>
              Vos avis resteront en ligne mais anonymisés, et vos attestations seront supprimées.
              Cette action est définitive.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Confirmez avec votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="destructive"
            disabled={!password || remove.isPending}
            onClick={() => remove.mutate()}
          >
            Supprimer définitivement
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Notifications (all roles) ----------

export function NotificationsPage() {
  const qc = useQueryClient();
  const { session, isLoading } = useSession();
  const { data, error, isPending } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    enabled: !!session,
  });
  const refresh = () => void qc.invalidateQueries();
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  if (isLoading) return <LoadingState />;
  if (!session)
    return (
      <div className="page-container">
        <PageHeading
          title="Notifications"
          description="Connectez-vous pour voir vos notifications."
        />
        <Button asChild>
          <Link to="/connexion">Se connecter</Link>
        </Button>
      </div>
    );
  return (
    <div className="page-container max-w-3xl">
      <PageHeading
        eyebrow="Restez informé(e)"
        title="Notifications"
        action={
          <Button
            variant="outline"
            onClick={() => readAll.mutate()}
            disabled={!data?.items.some((n) => !n.readAt)}
          >
            Tout marquer comme lu
          </Button>
        }
      />
      {error && <ErrorState error={error} />}
      {isPending && <LoadingState />}
      <div className="flex flex-col gap-3">
        {data?.items.map((n) => (
          <div key={n.id} className={`notification-item ${n.readAt ? "" : "unread"}`}>
            <Bell size={18} className="text-primary mt-1 shrink-0" />
            <div className="flex-1">
              <strong className="text-sm">{n.title}</strong>
              <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{n.body}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(n.createdAt).toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {n.link && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  onClick={() => !n.readAt && readOne.mutate(n.id)}
                >
                  <Link to={n.link}>Voir</Link>
                </Button>
              )}
              {!n.readAt && (
                <Button size="sm" variant="ghost" onClick={() => readOne.mutate(n.id)}>
                  Marquer comme lu
                </Button>
              )}
            </div>
          </div>
        ))}
        {data && !data.items.length && (
          <p className="text-muted-foreground">Aucune notification.</p>
        )}
      </div>
    </div>
  );
}
