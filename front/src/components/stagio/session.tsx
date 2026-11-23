// Session state, from GET /api/auth/me (cookie-based). Queries run in the browser only.
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { getSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Role, Session } from "@/types";

export const sessionKey = ["session"] as const;

export function useSession() {
  const query = useQuery({ queryKey: sessionKey, queryFn: getSession, staleTime: 60_000 });
  return { session: query.data ?? null, isLoading: query.isPending, refetch: query.refetch };
}

export function useRefreshSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sessionKey });
}

export function LoadingState({ text = "Chargement…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="animate-spin" size={18} />
      {text}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="account-banner pending my-6">
      {error instanceof Error ? error.message : "Une erreur est survenue."}
    </div>
  );
}

function Gate({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">
          <Lock />
        </div>
        <h1>{title}</h1>
        <p>{text}</p>
        {action}
      </div>
    </div>
  );
}

/**
 * Renders children only for the given role. The backend checks roles on every route anyway;
 * this only avoids showing an empty page.
 */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: (session: Session) => ReactNode;
}) {
  const { session, isLoading } = useSession();
  if (isLoading) return <LoadingState />;
  if (!session)
    return (
      <Gate
        title="Connexion requise"
        text="Connectez-vous pour accéder à cet espace."
        action={
          <Button asChild className="w-full">
            <Link to="/connexion">Se connecter</Link>
          </Button>
        }
      />
    );
  if (session.user.role !== role)
    return <Gate title="Accès réservé" text="Cet espace n’est pas disponible pour votre compte." />;
  if (role === "STUDENT" && !session.user.emailVerified)
    return (
      <Gate
        title="Vérifiez votre adresse email"
        text="Saisissez le code reçu par email pour activer votre compte."
        action={
          <Button asChild className="w-full">
            <Link to="/verification" search={{ email: session.user.email }}>
              Saisir mon code
            </Link>
          </Button>
        }
      />
    );
  return <>{children(session)}</>;
}
