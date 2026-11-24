import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";
import type { Role } from "@/types";
import { useSession } from "./session";

type NavItem = { to: string; label: string; short: string; icon: typeof BriefcaseBusiness };

const common: NavItem[] = [
  { to: "/offres", label: "Offres de stage", short: "Offres", icon: BriefcaseBusiness },
  { to: "/entreprises", label: "Entreprises", short: "Entreprises", icon: Building2 },
];

function navFor(role: Role | undefined): NavItem[] {
  if (role === "COMPANY")
    return [
      ...common,
      { to: "/entreprise", label: "Espace entreprise", short: "Espace", icon: LayoutDashboard },
    ];
  if (role === "ADMIN")
    return [
      ...common,
      { to: "/admin", label: "Administration", short: "Admin", icon: ShieldCheck },
    ];
  return [
    ...common,
    { to: "/mes-stages", label: "Mes stages", short: "Mes stages", icon: GraduationCap },
    { to: "/profil", label: "Profil", short: "Profil", icon: UserRound },
  ];
}

export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <GraduationCap />
      </span>
      stagio<span className="brand-dot">.</span>
    </Link>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useSession();
  const nav = navFor(session?.user.role);
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  async function signOut() {
    await logout().catch(() => undefined);
    qc.clear();
    toast.success("Vous êtes déconnecté(e)");
    void navigate({ to: "/" });
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav">
            {nav
              .filter((n) => n.to !== "/profil")
              .map((n) => (
                <Link key={n.to} to={n.to} className={isActive(n.to) ? "active" : ""}>
                  {n.label}
                </Link>
              ))}
          </nav>
          <div className="header-actions">
            {session ? (
              <>
                <Button asChild variant="ghost" size="icon" title="Notifications">
                  <Link to="/notifications" aria-label="Notifications" className="relative">
                    <Bell />
                    {session.unreadNotifications > 0 && (
                      <span className="notif-dot">{Math.min(session.unreadNotifications, 9)}</span>
                    )}
                  </Link>
                </Button>
                {session.user.role === "STUDENT" && (
                  <Button asChild variant="ghost" size="icon" title="Mon profil">
                    <Link to="/profil" aria-label="Mon profil">
                      <UserRound />
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" title="Se déconnecter" onClick={signOut}>
                  <LogOut />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="login-link">
                  <Link to="/connexion">Se connecter</Link>
                </Button>
                <Button asChild className="signup-link">
                  <Link to="/inscription">
                    Créer mon compte
                    <ArrowUpRight />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <nav className="bottom-nav">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className={isActive(n.to) ? "active" : ""}>
            <n.icon size={20} />
            <span>{n.short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div>
          <Brand />
          <p>Le premier pas vers votre avenir professionnel.</p>
        </div>
        <div className="footer-links">
          <Link to="/offres">Trouver un stage</Link>
          <Link to="/entreprises">Découvrir les entreprises</Link>
          <Link to="/inscription-entreprise">Espace entreprise</Link>
        </div>
        <div className="footer-links">
          <Link to="/cgu-etudiant">CGU étudiant</Link>
          <Link to="/cgu-entreprise">CGU entreprise</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Stagio. Fait pour les étudiants de l’ISGB.</span>
        <span>
          <ShieldCheck size={14} />
          Une communauté, des expériences authentiques.
        </span>
      </div>
    </footer>
  );
}
