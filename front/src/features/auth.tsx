// Authentication pages: student sign-up, login, password reset, company sign-up.
// Sign-up has no email verification step: the account is active and signed in right away.
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Building2, GraduationCap, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sessionKey } from "@/components/stagio/session";
import {
  errorMessage,
  forgotPassword,
  listCompanies,
  login,
  registerCompany,
  registerStudent,
  resetPassword,
} from "@/lib/api";
import { isStudentEmail, validPassword } from "@/lib/rules";
import type { Role } from "@/types";

const homeFor = (role: Role) =>
  role === "ADMIN" ? "/admin" : role === "COMPANY" ? "/entreprise" : "/offres";

function AuthCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">{icon}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  label = "Mot de passe",
  hint = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hint?: boolean;
}) {
  return (
    <label className="form-field">
      {label}
      <Input
        type="password"
        required
        autoComplete={hint ? "new-password" : "current-password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Votre mot de passe"
      />
      {hint && (
        <span className="form-note">
          8 caractères minimum, avec au moins une lettre et un chiffre.
        </span>
      )}
    </label>
  );
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

/** Mandatory acceptance of the terms of use and privacy policy (stored with its version). */
function TermsCheckbox({
  checked,
  onChange,
  terms,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  terms: "/cgu-etudiant" | "/cgu-entreprise";
}) {
  return (
    <label className="terms-check">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        J’accepte les{" "}
        <Link to={terms} target="_blank">
          {terms === "/cgu-etudiant"
            ? "conditions d’utilisation étudiant"
            : "conditions d’utilisation entreprise"}
        </Link>{" "}
        et la{" "}
        <Link to="/confidentialite" target="_blank">
          politique de confidentialité
        </Link>
        .
      </span>
    </label>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const { busy, run } = useSubmit();
  const emailError = touched && !isStudentEmail(email);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isStudentEmail(email)) return;
    if (!accepted) return void toast.error("Acceptez les conditions d’utilisation pour continuer.");
    if (!validPassword(password))
      return void toast.error(
        "Mot de passe : 8 caractères minimum, avec une lettre et un chiffre.",
      );
    void run(async () => {
      await registerStudent({
        name: name.trim(),
        email: email.trim(),
        password,
        acceptTerms: true,
      });
      await qc.invalidateQueries({ queryKey: sessionKey });
      toast.success("Bienvenue sur Stagio ! Votre compte est créé.");
      void navigate({ to: "/offres" });
    });
  }

  return (
    <AuthCard
      icon={<GraduationCap />}
      title="Rejoignez la communauté"
      subtitle="Votre avenir commence avec la communauté ISGB."
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="form-field">
          Nom et prénom
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom complet"
          />
        </label>
        <label className="form-field">
          Adresse email ISGB
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onBlur={() => setTouched(true)}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom.prenom@isgb.ucar.tn"
            aria-invalid={emailError}
          />
          {emailError && (
            <span className="form-error">
              Utilisez votre adresse universitaire se terminant par @isgb.ucar.tn.
            </span>
          )}
        </label>
        <PasswordField value={password} onChange={setPassword} hint />
        <TermsCheckbox checked={accepted} onChange={setAccepted} terms="/cgu-etudiant" />
        <Button type="submit" disabled={busy}>
          Créer mon compte
          <ArrowRight />
        </Button>
        <p className="form-note text-center">
          Déjà membre ?{" "}
          <Link className="text-primary font-medium" to="/connexion">
            Se connecter
          </Link>
        </p>
        <p className="form-note text-center">
          Vous êtes une entreprise ?{" "}
          <Link className="text-primary font-medium" to="/inscription-entreprise">
            Créer un compte entreprise
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, run } = useSubmit();

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const { user } = await login({ email: email.trim(), password });
      await qc.invalidateQueries({ queryKey: sessionKey });
      toast.success(`Bienvenue, ${user.name}`);
      void navigate({ to: homeFor(user.role) });
    });
  }

  return (
    <AuthCard
      icon={<GraduationCap />}
      title="Heureux de vous retrouver"
      subtitle="Retrouvez vos offres et vos expériences."
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="form-field">
          Adresse email
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom.prenom@isgb.ucar.tn"
          />
        </label>
        <PasswordField value={password} onChange={setPassword} />
        <Button type="submit" disabled={busy}>
          Se connecter
          <ArrowRight />
        </Button>
        <p className="form-note text-center">
          <Link className="text-primary font-medium" to="/mot-de-passe-oublie">
            Mot de passe oublié ?
          </Link>
        </p>
        <p className="form-note text-center">
          Pas encore de compte ?{" "}
          <Link className="text-primary font-medium" to="/inscription">
            Créer mon compte
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex justify-center">
      <InputOTP
        aria-label="Code à 6 chiffres"
        maxLength={6}
        value={value}
        onChange={onChange}
        pattern="^[0-9]+$"
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const { busy, run } = useSubmit();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!sent) {
      void run(async () => {
        await forgotPassword(email.trim());
        setSent(true);
        toast.success("Si un compte existe, un code vous a été envoyé par email");
      });
      return;
    }
    if (!validPassword(password))
      return void toast.error(
        "Mot de passe : 8 caractères minimum, avec une lettre et un chiffre.",
      );
    void run(async () => {
      await resetPassword({ email: email.trim(), code: otp, password });
      toast.success("Mot de passe modifié. Vous pouvez vous connecter.");
      void navigate({ to: "/connexion" });
    });
  }

  return (
    <AuthCard
      icon={<KeyRound />}
      title="Mot de passe oublié"
      subtitle="Recevez un code par email pour choisir un nouveau mot de passe."
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="form-field">
          Adresse email
          <Input
            type="email"
            required
            disabled={sent}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {sent && (
          <>
            <OtpInput value={otp} onChange={setOtp} />
            <PasswordField
              value={password}
              onChange={setPassword}
              label="Nouveau mot de passe"
              hint
            />
          </>
        )}
        <Button type="submit" disabled={busy || (sent && otp.length !== 6)}>
          {sent ? "Changer mon mot de passe" : "Recevoir un code"}
          <ArrowRight />
        </Button>
      </form>
    </AuthCard>
  );
}

/** Company account: claim an existing page or create a new one. Validated by the admin (tax ID / RNE). */
export function CompanySignupPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"claim" | "create">("claim");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    taxId: "",
    rne: "",
    claimCompanyId: "",
    accepted: false as boolean,
    companyName: "",
    city: "",
    sector: "",
    description: "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const { busy, run } = useSubmit();
  const companies = useQuery({
    queryKey: ["companies", "all"],
    queryFn: () => listCompanies({ limit: 100 }),
  });
  const unclaimed = companies.data?.items.filter((c) => !c.claimed) ?? [];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!validPassword(form.password))
      return void toast.error(
        "Mot de passe : 8 caractères minimum, avec une lettre et un chiffre.",
      );
    if (!form.accepted)
      return void toast.error("Acceptez les conditions d’utilisation pour continuer.");
    if (mode === "claim" && !form.claimCompanyId)
      return void toast.error("Choisissez votre fiche entreprise.");
    void run(async () => {
      await registerCompany({
        acceptTerms: true,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        taxId: form.taxId.trim(),
        ...(form.rne.trim() ? { rne: form.rne.trim() } : {}),
        ...(mode === "claim"
          ? { claimCompanyId: form.claimCompanyId }
          : {
              company: {
                name: form.companyName.trim(),
                city: form.city.trim(),
                sector: form.sector.trim(),
                ...(form.description.trim() ? { description: form.description.trim() } : {}),
              },
            }),
      });
      await qc.invalidateQueries({ queryKey: sessionKey });
      toast.success("Compte créé. Votre dossier va être examiné par l’équipe Stagio.");
      void navigate({ to: "/entreprise" });
    });
  }

  return (
    <AuthCard
      icon={<Building2 />}
      title="Espace entreprise"
      subtitle="Publiez vos offres et répondez aux avis de vos stagiaires. Chaque compte est vérifié (matricule fiscal / RNE)."
    >
      <form className="form-stack" onSubmit={submit}>
        <label className="form-field">
          Votre nom
          <Input
            required
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="Nom du responsable"
          />
        </label>
        <label className="form-field">
          Email professionnel
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
          />
        </label>
        <PasswordField value={form.password} onChange={set("password")} hint />
        <div className="form-grid">
          <label className="form-field">
            Matricule fiscal
            <Input required value={form.taxId} onChange={(e) => set("taxId")(e.target.value)} />
          </label>
          <label className="form-field">
            Extrait RNE (facultatif)
            <Input value={form.rne} onChange={(e) => set("rne")(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "claim" ? "secondary" : "ghost"}
            onClick={() => setMode("claim")}
          >
            Ma fiche existe déjà
          </Button>
          <Button
            type="button"
            variant={mode === "create" ? "secondary" : "ghost"}
            onClick={() => setMode("create")}
          >
            Créer ma fiche
          </Button>
        </div>
        {mode === "claim" ? (
          <label className="form-field">
            Votre entreprise
            <select
              className="form-select"
              value={form.claimCompanyId}
              onChange={(e) => set("claimCompanyId")(e.target.value)}
            >
              <option value="">Choisir…</option>
              {unclaimed.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.city}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="form-field">
              Nom de l’entreprise
              <Input
                required
                value={form.companyName}
                onChange={(e) => set("companyName")(e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label className="form-field">
                Ville
                <Input required value={form.city} onChange={(e) => set("city")(e.target.value)} />
              </label>
              <label className="form-field">
                Secteur
                <Input
                  required
                  value={form.sector}
                  onChange={(e) => set("sector")(e.target.value)}
                />
              </label>
            </div>
            <label className="form-field">
              Présentation (facultatif)
              <Textarea
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
              />
            </label>
          </>
        )}
        <TermsCheckbox
          checked={form.accepted}
          onChange={(v) => setForm((f) => ({ ...f, accepted: v }))}
          terms="/cgu-entreprise"
        />
        <Button type="submit" disabled={busy}>
          Envoyer ma demande
          <ArrowRight />
        </Button>
        <p className="form-note text-center">
          Déjà inscrit ?{" "}
          <Link className="text-primary font-medium" to="/connexion">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
