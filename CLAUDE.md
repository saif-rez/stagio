# Stagio – Contexte projet

## Produit
Application web (mobile-first) pour les étudiants de l'ISGB (Tunisie) : offres de stage + avis vérifiés sur l'expérience de stage en entreprise.

## Règles métier NON négociables
- On note une EXPÉRIENCE DE STAGE en entreprise, jamais une personne. Aucune fiche nominative d'encadrant.
- 3 critères notés /5 : Qualité de l'encadrement, Ambiance, Intérêt des missions.
- 1 avis par étudiant et par stage déclaré.
- Note moyenne affichée seulement si >= 3 avis, sinon "Pas encore assez d'avis".
- Avis anonyme : afficher "Étudiant(e) vérifié(e) – ISGB", l'année seulement (jamais les dates exactes).
- Badges : "Sponsorisé", "Avis vérifié", "Stage vérifié" (attestation validée par l'admin).
- Le sponsoring n'influence jamais les notes. L'entreprise ne peut ni supprimer ni modifier un avis : seulement répondre (1 réponse) ou signaler.
- Avis masqué automatiquement à partir de 3 signalements.
- Contact ancien stagiaire : opt-in "J'accepte d'être contacté", message 300 caractères max, 5 demandes/jour, expiration 7 jours. Pas de messagerie interne.
- Inscription étudiant : email @isgb.ucar.tn uniquement + code OTP à 6 chiffres.
- Rôles : Étudiant, Entreprise, Admin (pas de rôle Professeur).
- Champ "établissement" présent dans les modèles (multi-facultés plus tard).

## Stack frontend (dossier /front, généré par Lovable — stack conservé)
TanStack Start (React 19 + TanStack Router, routes fichiers dans src/routes) + Vite + TypeScript strict + Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react.
Ne pas migrer vers Next.js / HeroUI. Installer avec `npm install` (le .npmrc active legacy-peer-deps).
Lancer : `cd back && npm run dev` (port 4000) puis `cd front && npm run dev` (port 8080).

## Conventions
- Toute l'interface en FRANÇAIS. Code, noms de variables et commentaires en anglais.
- Accès aux données UNIQUEMENT via src/lib/api/* (appels à l'API /back avec credentials: "include"), jamais de fetch direct dans les composants. Lecture/écriture avec TanStack Query (useQuery / useMutation). En dev, Vite relaie /api vers http://localhost:4000 (cookie de session même origine).
- Session : hook useSession() et garde <RequireRole> dans src/components/stagio/session.tsx (les rôles sont de toute façon vérifiés côté serveur).
- Types partagés dans src/types/ (calqués sur le schéma Prisma de /back).
- Règles métier pures dans src/lib/rules.ts.
- Composants réutilisables dans src/components/, pas de duplication.
- Design : moderne, professionnel, épuré. Primaire #1F4E79, accent #2E86C1, fond #F7FAFC, cartes blanches rounded-xl, ombres douces, police Inter.
- Après chaque phase : `npm run build` et `npm run lint` doivent passer sans erreur (dans /front et dans /back).

## Backend (phase actuelle)
- Dossier : /back (API séparée du frontend Lovable dans /front).
- Stack : Node.js + Express + TypeScript strict + Prisma + PostgreSQL + Zod (validation).
- Auth : JWT en cookie httpOnly + secure + sameSite, mots de passe hachés avec argon2, OTP 6 chiffres hashé en base (expiration 10 min, 5 tentatives max).
- Sécurité : helmet, CORS limité à l'URL du frontend, rate limiting (auth, avis, demandes de contact), contrôle des rôles côté serveur sur CHAQUE route, aucune donnée sensible dans les réponses (auteur d'un avis anonyme jamais renvoyé sauf à l'admin).
- Fichiers (attestations) : stockage privé, URL signée temporaire réservée à l'admin.
- Emails : Nodemailer (SMTP via .env), un service d'email unique.
- Tâches planifiées : node-cron (expiration des demandes de contact, digest quotidien des nouvelles offres).
- Format d'erreur unique : { error: { code, message } }. Pagination : ?page=&limit=.
- Jamais de secrets dans le code : tout passe par .env, avec un .env.example à jour.