// Back-office: company accounts, proposed companies, certificates, reported reviews, offers.
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  Eye,
  FileCheck2,
  Flag,
  GitMerge,
  MessageSquare,
  Plus,
  ShieldCheck,
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
import { Badge, PageHeading, ReviewCard } from "@/components/stagio/shared";
import { ErrorState, LoadingState, RequireRole } from "@/components/stagio/session";
import {
  acceptClaim,
  approveCompany,
  createCompanyPage,
  errorMessage,
  getAdminStats,
  getCertificateUrl,
  listAdminCompanies,
  listAdminInternships,
  listAdminOffers,
  listClaims,
  listCompanies,
  listReportedReviews,
  mergeCompany,
  moderateReview,
  refuseClaim,
  refuseCompany,
  rejectInternship,
  setSponsoring,
  verifyInternship,
} from "@/lib/api";
import { internshipTypeLabel, reportReasonLabel } from "@/lib/rules";
import { OfferForm } from "./company";

type Area = "stats" | "claims" | "proposals" | "certificates" | "reports" | "offers" | "companies";
type Confirm = { title: string; description: string; run: () => Promise<unknown> };

const areas: { id: Area; title: string; icon: typeof Building2 }[] = [
  { id: "stats", title: "Vue d’ensemble", icon: BarChart3 },
  { id: "claims", title: "Comptes entreprise", icon: ShieldCheck },
  { id: "proposals", title: "Entreprises proposées", icon: GitMerge },
  { id: "certificates", title: "Attestations à vérifier", icon: FileCheck2 },
  { id: "reports", title: "Avis signalés", icon: Flag },
  { id: "offers", title: "Offres & sponsoring", icon: BriefcaseBusiness },
  { id: "companies", title: "Fiches entreprise", icon: Building2 },
];

export function AdminPage() {
  return <RequireRole role="ADMIN">{() => <Admin />}</RequireRole>;
}

function Admin() {
  const qc = useQueryClient();
  const [area, setArea] = useState<Area>("stats");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const run = useMutation({
    mutationFn: (c: Confirm) => c.run(),
    onSuccess: () => {
      toast.success("Décision enregistrée");
      setConfirm(null);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const ask = (title: string, description: string, fn: () => Promise<unknown>) =>
    setConfirm({ title, description, run: fn });
  const title = areas.find((a) => a.id === area)?.title ?? "Administration";

  return (
    <div className="page-container">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <h2>
            <ShieldCheck size={19} />
            Administration
          </h2>
          {areas.map((a) => (
            <Button
              key={a.id}
              variant={area === a.id ? "secondary" : "ghost"}
              onClick={() => setArea(a.id)}
            >
              <a.icon />
              {a.title}
            </Button>
          ))}
        </aside>
        <section className="admin-content">
          <PageHeading
            eyebrow="Espace administration"
            title={title}
            description="Une communauté fiable, grâce à une modération attentive."
          />
          {area === "stats" && <Stats />}
          {area === "claims" && <Claims ask={ask} />}
          {area === "proposals" && <Proposals ask={ask} />}
          {area === "certificates" && <Certificates ask={ask} />}
          {area === "reports" && <Reports ask={ask} />}
          {area === "offers" && <Offers ask={ask} />}
          {area === "companies" && <CompanyPages />}
        </section>
      </div>
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Annuler
            </Button>
            <Button disabled={run.isPending} onClick={() => confirm && run.mutate(confirm)}>
              <Check />
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Ask = (title: string, description: string, fn: () => Promise<unknown>) => void;

function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty: boolean }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {empty && (
            <tr>
              <td colSpan={head.length}>Rien à traiter pour le moment. 🎉</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Stats() {
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
  });
  if (isPending) return <LoadingState />;
  if (error || !data) return <ErrorState error={error} />;
  const cards: [string, number][] = [
    ["Étudiants vérifiés", data.beta.verifiedStudents],
    ["Avis publiés", data.beta.reviews],
    ["Entreprises notées", data.beta.ratedCompanies],
    ["Fiches revendiquées", data.beta.claimedCompanies],
    ["Comptes entreprise à valider", data.queues.pendingClaims],
    ["Entreprises proposées", data.queues.pendingCompanies],
    ["Attestations à vérifier", data.queues.pendingCertificates],
    ["Avis masqués", data.queues.hiddenReviews],
  ];
  return (
    <div className="kpi-grid">
      {cards.map(([label, value]) => (
        <div className="kpi-card" key={label}>
          <p>{label}</p>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Claims({ ask }: { ask: Ask }) {
  const { data, error, isPending } = useQuery({ queryKey: ["admin-claims"], queryFn: listClaims });
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  return (
    <Table
      head={["Compte", "Fiche demandée", "Matricule fiscal / RNE", "Décision"]}
      empty={!data?.items.length}
    >
      {data?.items.map((c) => (
        <tr key={c.id}>
          <td>
            <strong>{c.user.name}</strong>
            <p>
              {c.user.email} {c.user.emailVerifiedAt ? "· email vérifié" : "· email non vérifié"}
            </p>
          </td>
          <td>
            <strong>{c.company.name}</strong>
            <p>
              {c.company.sector} · {c.company.city}
              {c.company.status === "PENDING" ? " · nouvelle fiche" : " · fiche existante"}
            </p>
          </td>
          <td>
            {c.taxId}
            {c.rne && <p>RNE {c.rne}</p>}
          </td>
          <td>
            <div className="table-actions">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  ask(
                    "Valider ce compte entreprise ?",
                    `${c.user.name} pourra gérer la fiche ${c.company.name}.`,
                    () => acceptClaim(c.id),
                  )
                }
              >
                <Check />
                Accepter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  ask("Refuser ce compte ?", "L’entreprise sera notifiée par email.", () =>
                    refuseClaim(c.id),
                  )
                }
              >
                <X />
                Refuser
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function Proposals({ ask }: { ask: Ask }) {
  const [merging, setMerging] = useState<{ id: string; name: string } | null>(null);
  const [target, setTarget] = useState("");
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-proposals"],
    queryFn: () => listAdminCompanies({ status: "PENDING", proposed: true }),
  });
  const active = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => listCompanies({ limit: 100 }),
  });
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  return (
    <>
      <Table
        head={["Entreprise proposée", "Proposée par", "Stages liés", "Décision"]}
        empty={!data?.items.length}
      >
        {data?.items.map((c) => (
          <tr key={c.id}>
            <td>
              <strong>{c.name}</strong>
              <p>
                {c.sector} · {c.city}
              </p>
            </td>
            <td>{c.proposedBy?.name ?? "—"}</td>
            <td>{c._count.internships}</td>
            <td>
              <div className="table-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    ask("Valider cette entreprise ?", `${c.name} sera ajoutée à l’annuaire.`, () =>
                      approveCompany(c.id),
                    )
                  }
                >
                  <Check />
                  Valider
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Fusionner avec une fiche existante"
                  aria-label={`Fusionner ${c.name}`}
                  onClick={() => {
                    setTarget("");
                    setMerging({ id: c.id, name: c.name });
                  }}
                >
                  <GitMerge />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Refuser"
                  aria-label={`Refuser ${c.name}`}
                  onClick={() =>
                    ask("Refuser cette proposition ?", `${c.name} ne sera pas ajoutée.`, () =>
                      refuseCompany(c.id),
                    )
                  }
                >
                  <X />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <Dialog open={merging !== null} onOpenChange={(o) => !o && setMerging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fusionner « {merging?.name} »</DialogTitle>
            <DialogDescription>
              Les stages, avis et offres seront rattachés à la fiche existante choisie
              (anti-doublons).
            </DialogDescription>
          </DialogHeader>
          <select
            className="form-select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Choisir la fiche à conserver…</option>
            {active.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.city}
              </option>
            ))}
          </select>
          <Button
            disabled={!target}
            onClick={() => {
              const m = merging;
              if (!m) return;
              setMerging(null);
              ask("Confirmer la fusion ?", `« ${m.name} » sera supprimée après la fusion.`, () =>
                mergeCompany(m.id, target),
              );
            }}
          >
            <GitMerge />
            Fusionner
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Certificates({ ask }: { ask: Ask }) {
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-certificates"],
    queryFn: () => listAdminInternships("PENDING_VERIFICATION"),
  });
  async function preview(id: string) {
    try {
      // Short-lived signed link; the file is served only to an admin session.
      const { url } = await getCertificateUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  return (
    <Table head={["Étudiant", "Stage", "Attestation", "Décision"]} empty={!data?.items.length}>
      {data?.items.map((s) => (
        <tr key={s.id}>
          <td>
            <strong>{s.student?.name ?? "Compte supprimé"}</strong>
            <p>{s.student?.email}</p>
          </td>
          <td>
            {s.company.name}
            <p>
              {internshipTypeLabel[s.type]} · {s.year} · {s.domain}
            </p>
          </td>
          <td>
            <Button
              variant="ghost"
              size="sm"
              disabled={!s.hasCertificate}
              onClick={() => void preview(s.id)}
            >
              <Eye />
              Ouvrir
            </Button>
          </td>
          <td>
            <div className="table-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  ask(
                    "Valider cette attestation ?",
                    "L’avis lié recevra le badge « Stage vérifié » et l’étudiant sera notifié.",
                    () => verifyInternship(s.id),
                  )
                }
              >
                <Check />
                Valider
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  ask(
                    "Refuser cette attestation ?",
                    "Le document ne sera pas considéré comme une preuve de stage.",
                    () => rejectInternship(s.id),
                  )
                }
              >
                <X />
                Refuser
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function Reports({ ask }: { ask: Ask }) {
  const [note, setNote] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => listReportedReviews(),
  });
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  const items = data?.items.filter((r) => r.status === "PUBLISHED" || r.status === "HIDDEN") ?? [];
  return (
    <div className="flex flex-col gap-6">
      {items.map((r) => (
        <div key={r.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="red">{r.admin?.reportCount ?? 0} signalement(s)</Badge>
            {r.status === "HIDDEN" && <Badge tone="red">Masqué automatiquement</Badge>}
            {r.reports?.map((rep, i) => (
              <Badge key={i} tone="muted">
                {reportReasonLabel[rep.reason]}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">
              Auteur :{" "}
              {r.admin?.author
                ? `${r.admin.author.name} (${r.admin.author.email})`
                : "compte supprimé"}
            </span>
          </div>
          <ReviewCard review={r} />
          <div className="table-actions">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                ask(
                  "Maintenir cet avis ?",
                  "L’avis reste (ou redevient) visible et les signalements sont clôturés.",
                  () => moderateReview(r.id, "KEEP"),
                )
              }
            >
              <Check />
              Maintenir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNote("");
                setRequesting(r.id);
              }}
            >
              <MessageSquare />
              Demander une modification
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() =>
                ask("Supprimer cet avis ?", "L’avis sera retiré et son auteur notifié.", () =>
                  moderateReview(r.id, "REMOVE"),
                )
              }
            >
              <X />
              Supprimer
            </Button>
          </div>
        </div>
      ))}
      {!items.length && <p className="text-muted-foreground">Aucun avis signalé. 🎉</p>}
      <Dialog open={requesting !== null} onOpenChange={(o) => !o && setRequesting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander une modification</DialogTitle>
            <DialogDescription>
              L’avis est masqué jusqu’à sa correction. Votre message est envoyé à l’auteur.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. Merci de retirer le nom de la personne citée."
          />
          <Button
            onClick={() => {
              const id = requesting;
              if (!id) return;
              setRequesting(null);
              ask("Envoyer la demande ?", "L’auteur sera notifié par email.", () =>
                moderateReview(id, "REQUEST_CHANGES", note.trim() || undefined),
              );
            }}
          >
            Envoyer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Offers({ ask }: { ask: Ask }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-offers", search],
    queryFn: () => listAdminOffers(search),
  });
  return (
    <>
      <div className="flex flex-wrap justify-between gap-3 mb-4">
        <Input
          className="max-w-xs"
          aria-label="Rechercher une offre"
          placeholder="Rechercher une offre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Publier une offre externe
        </Button>
      </div>
      {error && <ErrorState error={error} />}
      {isPending ? (
        <LoadingState />
      ) : (
        <Table
          head={["Offre", "Entreprise / Source", "Sponsoring", "Actions"]}
          empty={!data?.items.length}
        >
          {data?.items.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.title}</strong>
                <p>
                  {internshipTypeLabel[o.type]} · {o.city} {o.active === false && "· désactivée"}
                </p>
              </td>
              <td>
                {o.company.name}
                {o.source?.name && <p>Source : {o.source.name}</p>}
              </td>
              <td>
                {o.sponsored ? (
                  <Badge tone="amber">
                    Sponsorisé
                    {o.sponsoredUntil
                      ? ` jusqu’au ${new Date(o.sponsoredUntil).toLocaleDateString("fr-FR")}`
                      : ""}
                  </Badge>
                ) : o.sponsorRequested ? (
                  <Badge tone="muted">Demandé</Badge>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <div className="table-actions">
                  {o.sponsored ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        ask(
                          "Retirer le sponsoring ?",
                          "L’offre retrouvera sa position habituelle.",
                          () => setSponsoring(o.id, false),
                        )
                      }
                    >
                      Retirer
                    </Button>
                  ) : (
                    ([7, 30] as const).map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          ask(
                            `Sponsoriser ${d} jours ?`,
                            "L’offre apparaîtra en tête de liste avec le badge « Sponsorisé ». Les notes ne changent pas.",
                            () => setSponsoring(o.id, true, d),
                          )
                        }
                      >
                        {d} j
                      </Button>
                    ))
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <OfferForm open={open} onClose={() => setOpen(false)} external />
    </>
  );
}

function CompanyPages() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", city: "", sector: "", description: "" });
  const [search, setSearch] = useState("");
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-companies", search],
    queryFn: () => listAdminCompanies({ status: "ACTIVE", search }),
  });
  const create = useMutation({
    mutationFn: () =>
      createCompanyPage({
        name: form.name.trim(),
        city: form.city.trim(),
        sector: form.sector.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success("Fiche entreprise créée");
      setForm({ name: "", city: "", sector: "", description: "" });
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const valid =
    form.name.trim().length >= 2 && form.city.trim().length >= 2 && form.sector.trim().length >= 2;
  return (
    <div className="flex flex-col gap-8">
      <div className="kpi-card">
        <p className="mb-3">
          Nouvelle fiche (sans compte) : les étudiants peuvent la noter immédiatement, l’entreprise
          pourra la revendiquer.
        </p>
        <div className="form-grid">
          <Input
            placeholder="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Ville"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            placeholder="Secteur"
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
          />
        </div>
        <Textarea
          className="mt-3"
          placeholder="Présentation (facultatif)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button
          className="mt-3"
          disabled={!valid || create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus />
          Créer la fiche
        </Button>
      </div>
      <Input
        className="max-w-xs"
        aria-label="Rechercher une fiche"
        placeholder="Rechercher une fiche…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && <ErrorState error={error} />}
      {isPending ? (
        <LoadingState />
      ) : (
        <Table
          head={["Entreprise", "Compte", "Stages", "Avis", "Offres"]}
          empty={!data?.items.length}
        >
          {data?.items.map((c) => (
            <tr key={c.id}>
              <td>
                <strong>{c.name}</strong>
                <p>
                  {c.sector} · {c.city}
                </p>
              </td>
              <td>{c.owner ? c.owner.email : "Non revendiquée"}</td>
              <td>{c._count.internships}</td>
              <td>{c._count.reviews}</td>
              <td>{c._count.offers}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
