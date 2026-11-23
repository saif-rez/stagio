# Déployer Stagio (Vercel + Render + Neon + Supabase Storage)

```
Navigateur ──► https://<site>.vercel.app          (frontend, Vercel)
                   │  /api/*  relayé côté serveur (front/src/routes/api/$.ts)
                   ▼
              https://stagio-api.onrender.com       (backend Express, Render gratuit)
                   ├── PostgreSQL : Neon
                   ├── Attestations : bucket privé Supabase Storage
                   └── Emails : Gmail SMTP
cron-job.org ──► POST /api/internal/cron/hourly | /digest   (tâches planifiées)
```

Le navigateur ne parle qu'au site Vercel : le cookie de session reste « first-party »
et fonctionne partout (Safari compris), même sans nom de domaine.

Durée totale : environ 30 minutes. Ordre conseillé : 1 → 2 → 3 → 4 → 5.

---

## 1. Supabase Storage (attestations privées)

Le disque de Render est effacé à chaque redéploiement : les attestations vont dans un bucket.

1. Crée un projet sur [supabase.com](https://supabase.com) (région Europe, ex. Frankfurt).
2. **Storage → New bucket** : nom `certificates`, **Public : désactivé**.
3. **Project Settings → Storage → S3 Connection** :
   - note l'**Endpoint** (ex. `https://xxxx.supabase.co/storage/v1/s3`) et la **Region** ;
   - **New access key** → note l'**Access key ID** et la **Secret access key** (affichée une seule fois).

## 2. Render (backend)

1. Crée un compte sur [render.com](https://render.com) avec ton GitHub.
2. **New → Blueprint** → choisis le dépôt `saif-rez/stagio` → Render lit `render.yaml`.
3. Render demande les valeurs marquées `sync: false` :

| Variable | Valeur |
| --- | --- |
| `FRONTEND_URL` | provisoirement `https://example.com` (corrigé à l'étape 4) |
| `API_URL` | idem |
| `DATABASE_URL` | URL Neon **avec** `-pooler`, suivie de `&pgbouncer=true` (copie de `back/.env`) |
| `DIRECT_URL` | URL Neon **sans** `-pooler` (copie de `back/.env`) |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | étape 1 |
| `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | copie de `back/.env` |

`JWT_SECRET`, `FILE_URL_SECRET` et `CRON_SECRET` sont générés automatiquement par Render.

4. **Apply**. Le premier build prend 3 à 5 minutes. Les migrations s'appliquent au démarrage
   (la base Neon est déjà prête, rien ne sera écrasé).
5. Vérifie : `https://stagio-api.onrender.com/api/health` → `{"status":"ok"}`.
   Les journaux doivent afficher `[email] SMTP ready`.

> Si le nom `stagio-api` est déjà pris, Render en propose un autre : utilise l'URL réelle partout.

## 3. Vercel (frontend)

1. Crée un compte sur [vercel.com](https://vercel.com) avec ton GitHub.
2. **Add New → Project** → importe `saif-rez/stagio`.
3. **Root Directory** : `front` (important). Le reste est lu dans `front/vercel.json`.
4. **Environment Variables** :

| Variable | Valeur |
| --- | --- |
| `API_ORIGIN` | `https://stagio-api.onrender.com` (URL Render, sans `/` final) |

5. **Deploy**. Note l'adresse obtenue, ex. `https://stagio.vercel.app`.

## 4. Relier les deux

Dans Render → `stagio-api` → **Environment** :

- `FRONTEND_URL` = `https://stagio.vercel.app`
- `API_URL` = `https://stagio.vercel.app` (les liens d'attestation passent par le site)

**Save Changes** → Render redémarre.

## 5. Tâches planifiées (cron-job.org)

Render gratuit s'endort après 15 min sans visite : les tâches sont déclenchées de l'extérieur.

1. Récupère `CRON_SECRET` : Render → `stagio-api` → Environment → œil à côté de la valeur.
2. Sur [cron-job.org](https://cron-job.org) (gratuit), crée deux tâches :

| Titre | URL | Planning | Méthode |
| --- | --- | --- | --- |
| Stagio – horaire | `https://stagio-api.onrender.com/api/internal/cron/hourly` | toutes les heures | POST |
| Stagio – digest | `https://stagio-api.onrender.com/api/internal/cron/digest` | tous les jours à 8 h (Africa/Tunis) | POST |

   Dans **Advanced → Headers**, ajoute pour chacune :
   `Authorization: Bearer <CRON_SECRET>`

3. **Test run** : la réponse doit être `200` avec `{"expiredContacts":…}` ou `{"digestsSent":…}`.
   Un `401` signifie que le secret est faux.

---

## Vérification finale

1. Ouvre le site Vercel → la page d'accueil affiche les offres (la 1re visite peut prendre
   ~1 min si Render dormait).
2. Connecte-toi avec le compte admin (`admin@stagio.tn`, mot de passe de `back/.env`).
3. Inscris un compte étudiant `@isgb.ucar.tn` → le code arrive par email.
4. Déclare un stage avec une attestation → l'admin l'ouvre depuis « Attestations à vérifier ».

## Mises à jour

Chaque `git push` sur `main` redéploie automatiquement Vercel et Render.
Les nouvelles migrations Prisma s'appliquent au démarrage du backend.

## Limites de l'offre gratuite

- Render s'endort après 15 min : première requête lente (~1 min). La tâche horaire de
  cron-job.org le réveille une fois par heure. Passer en Starter (7 $/mois) supprime ce délai.
- Gmail : ~500 emails/jour. Au-delà, passer à Brevo ou Resend (changer `SMTP_*` sur Render).
- Attestations : 4 Mo maximum (limite de taille des requêtes Vercel : 4,5 Mo).
