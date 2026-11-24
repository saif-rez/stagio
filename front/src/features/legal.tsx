// Legal pages: student terms, company terms, privacy policy (cahier des charges §4.3).
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LEGAL, TERMS_DATE_LABEL } from "@/lib/legal";

function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="page-container legal-page">
      <span className="eyebrow">Informations légales</span>
      <h1>{title}</h1>
      <p className="legal-meta">Version du {TERMS_DATE_LABEL}</p>
      <p className="legal-intro">{intro}</p>
      {children}
      <nav className="legal-nav">
        <Link to="/cgu-etudiant">CGU étudiant</Link>
        <Link to="/cgu-entreprise">CGU entreprise</Link>
        <Link to="/confidentialite">Politique de confidentialité</Link>
      </nav>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const Contact = () => <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;

function Publisher() {
  return (
    <Section title="Éditeur du service">
      <p>
        {LEGAL.serviceName} ({LEGAL.siteUrl}) est édité par {LEGAL.publisher}. Établissement pilote
        : {LEGAL.pilotEstablishment}. Contact : <Contact />.
      </p>
    </Section>
  );
}

export function StudentTermsPage() {
  return (
    <LegalLayout
      title="Conditions générales d’utilisation – Étudiants"
      intro="Ces conditions s’appliquent à tout étudiant qui crée un compte sur Stagio. En cochant la case prévue à l’inscription, vous les acceptez."
    >
      <Publisher />
      <Section title="1. Objet">
        <p>
          Stagio permet aux étudiants de consulter des offres de stage (PFE et stages d’été) et de
          partager leur expérience de stage en entreprise grâce à des avis vérifiés.
        </p>
      </Section>
      <Section title="2. Compte étudiant">
        <ul>
          <li>
            L’inscription est réservée aux étudiants disposant d’une adresse email institutionnelle
            (@isgb.ucar.tn). Le compte est actif dès sa création.
          </li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe.</li>
          <li>
            Un compte est strictement personnel. Les informations fournies doivent être exactes.
          </li>
        </ul>
      </Section>
      <Section title="3. Avis sur les stages">
        <ul>
          <li>
            On note une <strong>expérience de stage dans une entreprise</strong>, jamais une
            personne. Il est interdit de citer nommément un encadrant ou un salarié.
          </li>
          <li>
            Un seul avis est autorisé par stage déclaré, et uniquement pour un stage réellement
            effectué.
          </li>
          <li>
            Sont interdits : les faux avis, les propos insultants, diffamatoires ou
            discriminatoires, les données personnelles (noms, numéros de téléphone…) et les contenus
            hors sujet. Un filtre automatique bloque certains de ces contenus à la saisie.
          </li>
          <li>
            L’attestation de stage est facultative. Elle n’est consultée que par l’équipe Stagio et
            permet d’obtenir le badge « Stage vérifié ».
          </li>
        </ul>
      </Section>
      <Section title="4. Avis anonymes">
        <p>
          Vous pouvez publier un avis de façon anonyme : il s’affiche alors sous la mention «
          Étudiant(e) vérifié(e) – ISGB », avec l’année et le type de stage uniquement, jamais les
          dates exactes. L’avis reste lié à votre compte : seule l’équipe Stagio peut en voir
          l’auteur, notamment pour la modération.
        </p>
      </Section>
      <Section title="5. Modération">
        <ul>
          <li>Les avis sont publiés immédiatement et modérés a posteriori.</li>
          <li>
            Tout étudiant vérifié et l’entreprise concernée peuvent signaler un avis. Un avis est
            masqué automatiquement à partir de 3 signalements, dans l’attente d’une décision.
          </li>
          <li>
            L’équipe Stagio peut maintenir un avis, demander sa modification ou le supprimer. Vous
            êtes notifié de chaque décision.
          </li>
          <li>
            L’entreprise peut publier une seule réponse publique par avis. Elle ne peut ni modifier,
            ni masquer, ni supprimer un avis.
          </li>
        </ul>
      </Section>
      <Section title="6. Contact entre étudiants">
        <p>
          Si vous cochez « J’accepte d’être contacté(e) », d’autres étudiants vérifiés peuvent vous
          adresser une demande de contact (300 caractères maximum, 5 demandes par jour et par
          étudiant). Vous êtes libre d’accepter ou de refuser. Vos coordonnées ne sont partagées
          qu’en cas d’acceptation, et uniquement le moyen de contact que vous choisissez. Une
          demande sans réponse expire après 7 jours. L’usage de ce service à des fins commerciales
          ou de harcèlement est interdit.
        </p>
      </Section>
      <Section title="7. Offres et sponsoring">
        <p>
          Les offres sont publiées par les entreprises ou par l’équipe Stagio (avec mention de leur
          source). Les offres sponsorisées sont signalées par un badge « Sponsorisé ». Le sponsoring
          met en avant une offre mais n’a <strong>aucune influence sur les notes</strong> des
          entreprises. Stagio n’intervient pas dans le processus de recrutement.
        </p>
      </Section>
      <Section title="8. Suppression du compte">
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis votre profil. Vos avis restent en
          ligne mais deviennent anonymes et ne sont plus liés à aucun compte ; vos attestations de
          stage sont supprimées.
        </p>
      </Section>
      <Section title="9. Responsabilité et sanctions">
        <p>
          Les avis reflètent l’opinion de leurs auteurs. En cas de manquement à ces conditions,
          l’équipe Stagio peut supprimer un contenu et suspendre ou supprimer un compte.
        </p>
      </Section>
      <Section title="10. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </Section>
      <Section title="11. Modification des conditions et droit applicable">
        <p>
          Ces conditions peuvent évoluer ; la version en vigueur est datée en haut de cette page.
          Elles sont soumises au droit tunisien. Pour toute question : <Contact />.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function CompanyTermsPage() {
  return (
    <LegalLayout
      title="Conditions générales d’utilisation – Entreprises"
      intro="Ces conditions s’appliquent à toute entreprise qui crée un compte sur Stagio. En cochant la case prévue à l’inscription, l’entreprise les accepte."
    >
      <Publisher />
      <Section title="1. Compte entreprise et vérification">
        <ul>
          <li>
            Le compte est créé par une personne habilitée à représenter l’entreprise. Il est soumis
            à la validation de l’équipe Stagio après contrôle du matricule fiscal et/ou de l’extrait
            RNE.
          </li>
          <li>
            L’entreprise peut créer sa fiche ou revendiquer une fiche existante. Une fiche peut
            exister sans compte : les étudiants peuvent y publier leurs avis même si l’entreprise
            n’est pas inscrite.
          </li>
          <li>
            Les informations fournies doivent être exactes. Toute usurpation entraîne le refus ou la
            suppression du compte.
          </li>
        </ul>
      </Section>
      <Section title="2. Publication d’offres">
        <ul>
          <li>
            Les offres doivent correspondre à de vrais stages (PFE ou stage d’été), décrits de façon
            honnête, sans contenu discriminatoire.
          </li>
          <li>
            La candidature se fait par lien externe ou par email. Stagio ne collecte pas de CV et
            n’intervient pas dans le recrutement.
          </li>
        </ul>
      </Section>
      <Section title="3. Règles relatives aux avis">
        <ol>
          <li>
            L’entreprise ne peut <strong>ni supprimer, ni modifier, ni masquer</strong> un avis.
          </li>
          <li>
            Elle peut signaler un avis (faux avis, insultes, données personnelles, hors sujet) ; la
            décision appartient à l’équipe Stagio.
          </li>
          <li>
            Elle dispose d’un droit de réponse public : <strong>une réponse par avis</strong>,
            courtoise et sans donnée personnelle sur le stagiaire.
          </li>
          <li>
            Il est interdit de rechercher l’identité de l’auteur d’un avis anonyme, de faire
            pression sur un étudiant ou de publier de faux avis.
          </li>
        </ol>
      </Section>
      <Section title="4. Sponsoring">
        <ol>
          <li>Une offre sponsorisée porte un badge « Sponsorisé » visible.</li>
          <li>
            Le sponsoring met en avant l’offre, <strong>jamais les notes</strong> : la note d’une
            entreprise est identique qu’elle paie ou non.
          </li>
          <li>
            Pendant la phase beta, le sponsoring est gratuit. Ses conditions tarifaires futures
            seront communiquées avant toute facturation.
          </li>
        </ol>
      </Section>
      <Section title="5. Données des étudiants">
        <p>
          Les coordonnées d’un étudiant ne sont jamais transmises à l’entreprise par Stagio.
          L’entreprise s’engage à n’utiliser les candidatures reçues que dans le cadre du
          recrutement.
        </p>
      </Section>
      <Section title="6. Sanctions">
        <p>
          En cas de manquement, l’équipe Stagio peut retirer une offre, suspendre le sponsoring ou
          supprimer le compte entreprise.
        </p>
      </Section>
      <Section title="7. Données personnelles">
        <p>
          Les données du compte (nom du responsable, email, matricule fiscal / RNE) sont traitées
          selon la <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </Section>
      <Section title="8. Modification des conditions et droit applicable">
        <p>
          Ces conditions peuvent évoluer ; la version en vigueur est datée en haut de cette page.
          Elles sont soumises au droit tunisien. Contact : <Contact />.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      intro="Cette politique explique quelles données Stagio collecte, pourquoi, combien de temps elles sont conservées et quels sont vos droits, conformément à la loi organique n° 2004-63 du 27 juillet 2004 portant sur la protection des données à caractère personnel."
    >
      <Section title="1. Responsable du traitement">
        <p>
          {LEGAL.publisher}. Contact : <Contact />. Déclaration : {LEGAL.inpdpDeclaration}.
        </p>
      </Section>
      <Section title="2. Données collectées">
        <ul>
          <li>
            <strong>Compte étudiant</strong> : nom, email institutionnel, mot de passe (stocké
            chiffré, jamais en clair), établissement, domaines suivis.
          </li>
          <li>
            <strong>Stages et avis</strong> : entreprise, année, type et domaine du stage, notes,
            commentaire, choix d’anonymat et d’être contacté(e).
          </li>
          <li>
            <strong>Attestation de stage</strong> (facultative) : document PDF ou image.
          </li>
          <li>
            <strong>Demandes de contact</strong> : message et, si vous acceptez, le moyen de contact
            que vous choisissez de partager.
          </li>
          <li>
            <strong>Compte entreprise</strong> : nom du responsable, email, matricule fiscal / RNE,
            informations de la fiche.
          </li>
          <li>
            <strong>Données techniques</strong> : cookie de session (connexion) et adresse IP,
            utilisée uniquement pour limiter les abus (nombre de tentatives).
          </li>
        </ul>
        <p>Stagio n’utilise ni cookie publicitaire ni outil de suivi publicitaire.</p>
      </Section>
      <Section title="3. Finalités">
        <ul>
          <li>
            Réserver l’inscription aux adresses institutionnelles des étudiants et vérifier les
            entreprises (matricule fiscal / RNE).
          </li>
          <li>Publier les avis et les offres, et calculer les notes des entreprises.</li>
          <li>Modérer les contenus signalés et lutter contre les faux avis.</li>
          <li>Mettre en relation les étudiants qui l’acceptent.</li>
          <li>
            Envoyer les emails liés au service : codes de réinitialisation du mot de passe,
            notifications, et résumé des nouvelles offres (désactivable dans votre profil).
          </li>
        </ul>
      </Section>
      <Section title="4. Qui voit quoi">
        <ul>
          <li>
            Avis anonyme : le public voit « Étudiant(e) vérifié(e) – ISGB », l’année et le type de
            stage. Seule l’équipe Stagio voit l’auteur.
          </li>
          <li>
            Attestations : accessibles <strong>uniquement à l’équipe Stagio</strong>, par des liens
            temporaires, jamais publiques.
          </li>
          <li>
            Coordonnées : partagées avec un autre étudiant seulement si vous acceptez sa demande de
            contact.
          </li>
          <li>
            Les entreprises ne reçoivent aucune donnée personnelle des étudiants de la part de
            Stagio.
          </li>
        </ul>
      </Section>
      <Section title="5. Durée de conservation">
        <ul>
          <li>Données du compte et attestations : jusqu’à la suppression du compte.</li>
          <li>
            Avis : conservés après la suppression du compte, mais anonymisés et détachés de toute
            identité.
          </li>
          <li>Codes de réinitialisation du mot de passe : 10 minutes maximum.</li>
          <li>Demandes de contact : expirées après 7 jours sans réponse.</li>
        </ul>
      </Section>
      <Section title="6. Hébergement et prestataires">
        <p>
          Les données sont hébergées et traitées par les prestataires suivants, qui n’agissent que
          pour le compte de Stagio :
        </p>
        <ul>
          {LEGAL.processors.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> : {p.role} ({p.location}).
            </li>
          ))}
        </ul>
        <p>
          Certaines données sont donc hébergées hors de Tunisie. Les échanges sont chiffrés (HTTPS).
        </p>
      </Section>
      <Section title="7. Sécurité">
        <p>
          Mots de passe chiffrés (Argon2), connexion par cookie sécurisé, HTTPS partout, contrôle
          des droits sur chaque action, attestations en stockage privé, limitation des tentatives de
          connexion.
        </p>
      </Section>
      <Section title="8. Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification et d’opposition sur vos données. Vous
          pouvez modifier votre nom et vos préférences dans votre profil, et supprimer votre compte
          à tout moment. Pour toute autre demande : <Contact />. Vous pouvez également saisir
          l’Instance nationale de protection des données personnelles (INPDP).
        </p>
      </Section>
    </LegalLayout>
  );
}
