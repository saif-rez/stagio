import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ShieldCheck,
  Users,
  GraduationCap,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferCard, ReviewCard } from "@/components/stagio/shared";
import { useQuery } from "@tanstack/react-query";
import { getPublicStats, listLatestReviews, listOffers } from "@/lib/api";
import hero from "@/assets/stagio-students.asset.json";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stagio — Trouvez le stage qui vous ressemble" },
      {
        name: "description",
        content:
          "Explorez les stages en Tunisie, lisez les avis vérifiés et échangez avec les étudiants de l’ISGB.",
      },
      { property: "og:title", content: "Stagio — Trouvez le stage qui vous ressemble" },
      {
        property: "og:description",
        content:
          "Votre prochain stage commence ici. Offres et expériences vérifiées de la communauté ISGB.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
function Index() {
  const offers = useQuery({
    queryKey: ["offers", "home"],
    queryFn: () => listOffers({ limit: 3 }),
  });
  const reviews = useQuery({
    queryKey: ["reviews", "latest"],
    queryFn: () => listLatestReviews(2),
  });
  const stats = useQuery({ queryKey: ["public-stats"], queryFn: getPublicStats });
  return (
    <>
      <section className="hero">
        <img
          className="hero-photo"
          src={hero.url}
          alt="Trois étudiants tunisiens échangent autour d’un ordinateur dans un espace de travail"
        />
        <div className="hero-content">
          <div className="hero-tag">
            <GraduationCap size={14} />
            La communauté des étudiants de l’ISGB
          </div>
          <h1>
            Le bon stage.
            <br />
            Les vrais avis.
            <br />
            <span>Votre avenir.</span>
          </h1>
          <p className="hero-copy">
            Trouvez le stage qui vous ressemble, découvrez les expériences de vos pairs et faites
            votre premier pas en confiance.
          </p>
          <div className="hero-buttons">
            <Button asChild size="lg">
              <Link to="/inscription">
                Créer mon compte
                <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/offres">
                Voir les offres
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="hero-community">
            <div className="avatar-stack">
              <span>YB</span>
              <span>AT</span>
              <span>MG</span>
              <span>+25</span>
            </div>
            <span>
              Une communauté <strong>100 % ISGB</strong>,<br />
              des expériences qui font la différence.
            </span>
          </div>
        </div>
        <div className="photo-note">
          <span className="check-icon">
            <Check size={18} />
          </span>
          <div>
            <strong>Des avis authentiques, des choix éclairés.</strong>
            <p>Par les étudiants, pour les étudiants.</p>
          </div>
        </div>
      </section>
      <section className="trust-band">
        <div className="container">
          <p>Des entreprises où votre talent peut grandir</p>
          <div className="partner-logos">
            <span>VERMEG</span>
            <span>
              TELNET<span className="partner-soft"> group</span>
            </span>
            <span className="partner-soft">sofrecom</span>
            <span>BIAT</span>
            <span className="partner-soft">sagemcom</span>
            <span>Wevioo</span>
          </div>
        </div>
      </section>
      <section className="features-section">
        <div className="container">
          <div className="center-heading">
            <span className="eyebrow">Bien plus qu’une plateforme de stages</span>
            <h2>Votre prochain chapitre commence ici.</h2>
            <p>Les bonnes opportunités. Les bons conseils. La bonne communauté.</p>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <BriefcaseBusiness size={22} />
              </div>
              <h3>Un stage à votre image</h3>
              <p>
                PFE ou stage d’été, trouvez les offres qui correspondent à votre domaine et à vos
                ambitions.
              </p>
              <Link to="/offres">
                Explorer les offres
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <ShieldCheck size={22} />
              </div>
              <h3>Des avis, pas des promesses</h3>
              <p>
                Encadrement, ambiance, missions : découvrez ce que les étudiants ont vraiment vécu
                en entreprise.
              </p>
              <Link to="/entreprises">
                Lire les avis vérifiés
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Users size={22} />
              </div>
              <h3>Avancer, ensemble</h3>
              <p>
                Échangez avec ceux qui sont passés avant vous et partagez votre expérience avec la
                communauté.
              </p>
              <Link to="/mes-stages">
                Partager mon expérience
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">À vous de jouer</span>
              <h2>Des opportunités à saisir</h2>
              <p>Votre prochain stage se trouve peut-être juste ici.</p>
            </div>
            <Link to="/offres">
              Toutes les offres
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="offer-grid">
            {offers.data?.items.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </div>
      </section>
      <section className="stats-section">
        <div className="container stats-grid">
          <div>
            <strong>{stats.data?.companies ?? "—"}</strong>
            <p>Entreprises à découvrir</p>
          </div>
          <div>
            <strong>{stats.data?.offers ?? "—"}</strong>
            <p>Opportunités de stage</p>
          </div>
          <div>
            <strong>{stats.data?.reviews ?? "—"}</strong>
            <p>Expériences partagées</p>
          </div>
          <div>
            <strong>100 %</strong>
            <p>Communauté ISGB</p>
          </div>
        </div>
      </section>
      <section className="landing-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Ils sont passés par là</span>
              <h2>Leurs expériences, vos repères.</h2>
              <p>Des retours sincères pour choisir en toute confiance.</p>
            </div>
            <Link to="/entreprises">
              Découvrir les avis
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="review-grid">
            {reviews.data?.items.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
            {reviews.data && !reviews.data.items.length && (
              <p className="text-muted-foreground">
                Les premiers avis arrivent bientôt. Vous avez fait un stage ?{" "}
                <Link to="/mes-stages" className="text-primary font-medium">
                  Partagez votre expérience
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
