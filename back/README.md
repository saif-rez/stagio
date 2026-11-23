# Stagio – API backend

API REST séparée du frontend Lovable (`/front`).
Stack : Node.js + Express 5 + TypeScript strict + Prisma 6 + PostgreSQL + Zod.

## Démarrage

```bash
cd back
npm install                 # le .npmrc active legacy-peer-deps
cp .env.example .env        # puis remplir DATABASE_URL, JWT_SECRET, FILE_URL_SECRET…
npx prisma migrate deploy   # crée les tables (ou `npm run db:migrate` en dev)
npm run db:seed             # établissement ISGB + compte admin + premières fiches/offres
npm run dev                 # http://localhost:4000/api
```

Base PostgreSQL : locale, [Neon](https://neon.tech) ou Supabase. Il suffit de mettre l'URL dans `DATABASE_URL`.
Sans `SMTP_HOST`, les emails (codes OTP, notifications) sont affichés dans la console.

| Script | Rôle |
| --- | --- |
| `npm run dev` | serveur avec rechargement |
| `npm run build` / `npm start` | build TypeScript puis lancement de `dist/` |
| `npm run lint` | `tsc --noEmit` + ESLint |
| `npm test` | tests (sans base de données) |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |

## Conventions

- Erreurs : toujours `{ "error": { "code": "…", "message": "…" } }` (+ `details` pour la validation).
- Pagination : `?page=1&limit=20` → `{ items, page, limit, total, totalPages }`.
- Session : cookie `httpOnly` (JWT), `secure` + `SameSite=None` en production.
  Le frontend doit appeler l'API avec `credentials: "include"`.
- Rôles vérifiés côté serveur sur chaque route : `STUDENT` (email vérifié), `COMPANY` (validé par l'admin), `ADMIN`.
- L'auteur d'un avis anonyme n'est jamais renvoyé, sauf à l'admin ; seule l'année du stage est exposée.
- Types de stage : `PFE` | `SUMMER` (« Stage d'été »).

## Endpoints (`/api`)

**Auth** – `POST /auth/register/student`, `POST /auth/register/company`, `POST /auth/verify-email`,
`POST /auth/resend-otp`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/password/forgot`,
`POST /auth/password/reset`, `GET|PATCH|DELETE /auth/me`

**Public** – `GET /companies`, `GET /companies/:id`, `GET /companies/:id/reviews`,
`GET /offers?search&domain&type&city&minRating&sort=recent|rating`, `GET /offers/:id`

**Étudiant (email vérifié)** – `GET /internships/me`, `POST /internships`,
`POST /internships/:id/certificate` (multipart `file`, PDF/PNG/JPG), `POST /internships/:id/review`,
`GET /reviews/me`, `PATCH /reviews/:id`, `POST /reviews/:id/reports`,
`GET /contact-requests?box=received|sent`, `POST /contact-requests`,
`POST /contact-requests/:id/accept|refuse`

**Entreprise (validée)** – `GET /company/dashboard`, `PATCH /company/profile`, `GET|POST /company/offers`,
`PATCH /company/offers/:id`, `GET /company/reviews`, `POST /reviews/:id/reply`, `POST /reviews/:id/reports`,
`POST /company/claims` (compte non encore validé)

**Notifications** – `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`

**Admin** – `GET /admin/stats`, `GET /admin/claims`, `POST /admin/claims/:id/accept|refuse`,
`GET|POST /admin/companies`, `PATCH /admin/companies/:id`, `POST /admin/companies/:id/approve|refuse|merge`,
`GET|POST /admin/offers`, `PATCH /admin/offers/:id`, `POST /admin/offers/:id/sponsor`,
`GET /admin/internships`, `GET /admin/internships/:id/certificate` (URL signée temporaire),
`POST /admin/internships/:id/verify|reject`, `GET /admin/reviews`, `POST /admin/reviews/:id/moderate`

**Fichiers** – `GET /files/certificates/:key?expires&sig` (session admin + signature valide)

## Tâches planifiées (node-cron, fuseau Africa/Tunis)

- toutes les heures : expiration des demandes de contact sans réponse depuis 7 jours ;
- toutes les heures : fin des sponsorings de 7 / 30 jours ;
- chaque jour (`DIGEST_CRON`, 8 h par défaut) : digest des nouvelles offres dans les domaines suivis.

## Structure

```
prisma/            schéma, migrations, seed
src/config/        variables d'environnement (validées par Zod)
src/lib/           erreurs, JWT, OTP, argon2, pagination, règles métier, stockage privé
src/middleware/    session, rôles, rate limiting
src/services/      email (Nodemailer), notifications
src/modules/*/     routes par domaine (auth, companies, offers, internships, reviews, contacts, company, admin, files)
src/jobs/          tâches planifiées
tests/             tests Vitest
```
