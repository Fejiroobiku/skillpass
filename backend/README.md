# SkillPass backend

REST API for SkillPass, the trainer-verified skills passport for informal apprentices in Nigeria.
Node.js, Express 5, PostgreSQL, JWT authentication, bcrypt password hashing.

The point of this API is to move the integrity rules out of the browser. In the frontend demo, rules such as the
daily issuing limit, probation, duplicate-evidence checks and credential signing run in React state, so anyone can
bypass them. Here they run on the server and, where possible, inside the database.

## Quick start

You need Node 22 or later and PostgreSQL 14 or later.

```bash
cd backend
cp .env.example .env          # then set DATABASE_URL, JWT_SECRET, SIGNING_KEY
npm install
npm run db:schema             # create the tables (empty database only)
npm run db:seed               # load the demo data and sign every credential
npm run dev                   # http://localhost:4000
```

The server will not start while `JWT_SECRET` or `SIGNING_KEY` still hold the placeholder text from `.env.example`,
or if the two are the same. Generate each one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Check it is alive: `curl http://localhost:4000/api/health`

Try a public verification, no login needed: `curl http://localhost:4000/api/verify/SP-2BNC-8QPE`

Demo accounts all use the password `demo1234`: `admin@skillpass.ng`, `babatunde@skillpass.ng` (trainer),
`tobi@skillpass.ng` (apprentice), `folake@skillpass.ng` (employer).

If you prefer psql, `psql -d skillpass -f database/schema.sql` and `-f database/seed.sql` also work, but then run
`npm run db:resign` so the seeded credentials get a valid signature for your `SIGNING_KEY`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the API and restart on file changes |
| `npm start` | Start the API |
| `npm test` | Run the end-to-end tests (see Testing) |
| `npm run db:schema` | Create all tables in an empty database |
| `npm run db:seed` | Load demo data, then sign every credential |
| `npm run db:resign` | Recompute all credential signatures (after changing `SIGNING_KEY`) |
| `npm run db:reset` | Drop everything, then schema and seed. Refuses to run when `NODE_ENV=production` |

## Environment variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `DATABASE_SSL` | `true` for hosted databases that require SSL (Neon, Supabase, Render) |
| `JWT_SECRET` | 32+ characters. Signs login tokens |
| `SIGNING_KEY` | 32+ characters. Signs credentials. Keep it different from `JWT_SECRET` and never change it casually: every existing signature must be recomputed with `npm run db:resign` |
| `CORS_ORIGINS` | Comma-separated frontend origins, for example `http://localhost:5173` |
| `PUBLIC_URL` | Public base URL of this API, used to build evidence links |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Where evidence is stored (local disk) and the largest file accepted |
| `ALLOW_DEMO_EVIDENCE` | `true` lets the demo build upload generated sample evidence (marked `source=demo`). Never switch it on with real participants |
| `BCRYPT_ROUNDS`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV` | Optional. Defaults are 12, 7d, 4000, development |

Never commit `.env`. It is already in `.gitignore`.

## How each integrity rule is enforced

| Rule | Where it is enforced |
|---|---|
| Only approved trainers with verified association membership can issue | `loadTrainerForIssuing`, used by issuing, evidence and assessments |
| A trainer can only issue to their own apprentices, for skills in their own trade | `POST /api/credentials` |
| A live video showing a fresh code is required | Codes come from `POST /api/evidence/challenges`: one use, 15 minutes, bound to the trainer |
| The same file can never back two credentials | The server computes SHA-256 itself, and `evidence.sha256` is `UNIQUE` in the database |
| Evidence type is checked from the file bytes, not the browser's claim | `lib/storage.js` |
| Every rubric criterion must be observed | `POST /api/credentials`, rubric from `skill_criteria` |
| Daily issuing limit holds extra credentials for admin review | Counted per Lagos day under a row lock, so simultaneous requests cannot both slip through |
| New trainers (probation) and advanced skills need a co-signer | Co-signer must be an approved trainer or employer in the same trade, never the issuer |
| One live credential per apprentice per skill | Partial unique index on `credentials` |
| Signatures detect tampering | HMAC-SHA256 over id, apprentice, skill, trainer, time and evidence hashes. `GET /api/verify/:id` returns `signatureValid` |
| The audit log cannot be edited | Database triggers reject `UPDATE`, `DELETE` and `TRUNCATE` on `audit_log` |
| Suspending an account takes effect immediately | The account is re-read on every request, not only at login |
| Trust score and risk signals match the frontend | Ported from `utils/credentials.ts` and `utils/risk.ts`, and checked against them on the seed data |

## API overview

All routes are under `/api`. Send `Authorization: Bearer <token>` where a role is listed. Errors are `{ "error": "message" }`.

| Area | Endpoints |
|---|---|
| Public | `GET /health`, `/trades`, `/associations`, `/skills`, `/trainers`, `/verify/:id`, `/passport/:apprenticeId`, `POST /verify/:id/events`, `PATCH /verify/events/:eventId` |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/withdraw-consent`, `GET /auth/me` |
| Trainer | `GET /trainer/apprentices`, `/trainer/standing`, `/trainer/cosigners`, `POST /evidence/challenges`, `POST /evidence` (multipart, field `file`), `GET /evidence/pending`, `POST /credentials`, `POST /attempts` |
| Any signed-in user | `GET /bootstrap` (everything your screens need, scoped to your role), `/credentials`, `/notifications`, `/settings`, `POST /notifications/read-all`, `/notifications/:id/read`, `POST /sus` (usability survey) |
| Apprentice | `POST /credentials/:id/confirm`, `/credentials/:id/dispute`, `POST /reports`, `GET /reports` |
| Trainer or employer | `POST /credentials/:id/cosign` |
| Trainer | `POST /skills/propose` |
| Employer | `POST /jobs`, `/jobs/:id/referrals`, `/feedback` |
| Apprentice or employer | `PATCH /referrals/:id` |
| Trainer, employer or admin | `POST /credentials/:id/flag` |
| Trainer (own) or admin | `POST /credentials/:id/revoke` |
| Admin | `GET /admin/review`, `/admin/users`, `/admin/audit-log`, `POST /admin/credentials/:id/release`, `/admin/credentials/:id/reinstate`, `/admin/flags/:id/resolve`, `/admin/audit-samples/run`, `/admin/audit-samples/:id/complete`, `/admin/trainers/:id/verify-membership`, `/admin/trainers/:id/misconduct`, `/admin/users/:id/approve`, `/admin/users/:id/status`, `/admin/audit-samples/:id/assign`, `/admin/trainers/:id/audit`, `/admin/skills`, `/admin/skills/:id/review`, `/admin/trades`, `PATCH /admin/reports/:id`, `/admin/settings` |

Issuing a credential is a three-step flow:

1. `POST /api/evidence/challenges` returns a four-digit `code`. The trainer shows it in the video.
2. `POST /api/evidence` (multipart: `file`, plus `challengeCode` for video, `caption`, `locationLabel`, `lat`, `lng`, `durationSec`) once per photo or video. Returns an evidence `id`.
3. `POST /api/credentials` with `{ apprenticeId, skillId, evidenceIds, criteriaMet, note, cosignRequestedFrom? }`.

## Testing

The tests run against a real PostgreSQL database and wipe it on every run, so use a separate one:

```bash
createdb skillpass_test
npm test
```

Set `TEST_DATABASE_URL` to use another database. The URL must contain `test`, otherwise the suite refuses to run.
The suite covers authentication, public verification and tamper detection, evidence upload and duplicate blocking,
every issuing rule, co-signing, the daily limit (including simultaneous requests), probation, flags and disputes,
misconduct, audit re-checks, confidential reports and the append-only audit log.

## Deploying (from the README's plan)

1. Create a Postgres database on Neon or Supabase. Set `DATABASE_SSL=true`.
2. Run `npm run db:schema` against it (set `DATABASE_URL` locally first). Run `npm run db:seed` only for a demo database.
3. On Render create a Web Service with root directory `backend`, build command `npm install`, start command `npm start`.
   Set `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `SIGNING_KEY`, `CORS_ORIGINS` (your frontend URL), `PUBLIC_URL` (the Render URL) and `NODE_ENV=production`.
4. Point the frontend at the Render URL.

The demo seed contains accounts with a published password. Never load it into a database with real participants.

## Not built yet

- SMS and email delivery. Notifications are saved with their channel, but nothing sends them yet.
- Evidence is stored on local disk, which is wiped on Render's free tier. Replace `storeFile()` in `src/lib/storage.js` with an upload to Supabase Storage or Cloudinary.
- Withdrawing consent closes the account but does not yet delete or anonymise personal data.
- Password reset and email verification.
- A script to create the first real administrator for a production database. The seeded admin has a published demo password.
- The random audit sample runs when an administrator presses the button, not on a schedule.
- Credentials are signed with a server-side HMAC. Only the server can verify them. Public-key signatures would let anyone verify offline.
