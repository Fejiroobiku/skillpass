# SkillPass

A trainer-verified digital skills passport for informal apprentices in Nigeria.

## Description

In Nigeria, most tradespeople learn through informal apprenticeship and end up with no record an employer can check. SkillPass lets a trainer issue a credential to an apprentice, backed by photo or video evidence. Anyone can then verify that credential on a public page, and the system has safeguards that keep trainers honest.

This is the initial version for the supervisor review. It covers the main flow:
trainer issues a credential -> admin reviews it if it is flagged or held -> anyone verifies it publicly -> credentials can be flagged or revoked.

**GitHub repo:** [paste link here]
**Live demo:** [paste deployed link here]
**Demo video:** [paste link here]

## Features in this version

| Role | What it can do |
|---|---|
| Trainer | Issue credentials with evidence, manage apprentices, view own credentials and skills |
| Apprentice | View skills passport, confirm skills, see job referrals |
| Employer | Post jobs, rate apprentices, flag suspicious credentials |
| Admin | Approve trainers, review the queue, manage users and skills, view pilot metrics |
| Public | Verify a credential by ID or link, no login needed |

Integrity safeguards:
- Evidence captured in the app (camera) and file hashing (SHA-256)
- Risk score and trust badge for trainers
- Review queue for held or flagged credentials
- Apprentice confirmation of skills
- Revoke and flag workflow
- Audit log of every sensitive action

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Backend (in progress):** Node.js, Express, JWT authentication, bcrypt [update when done]
- **Database (in progress):** PostgreSQL [update when done]
- **Hosting (planned):** see Deployment plan

## Setup

### Prerequisites
- Node.js 18 or later
- npm
- PostgreSQL 14 or later [needed once the backend is added]

### Run the frontend
```bash
git clone [your repo link]
cd [repo folder]
npm install
npm run dev
```
Open the local address shown in the terminal (usually http://localhost:5173).

### Run the backend [update when done]
```bash
cd backend
cp .env.example .env      # add DATABASE_URL, JWT_SECRET, SIGNING_KEY
npm install
psql -d skillpass -f database/schema.sql
psql -d skillpass -f database/seed.sql
npm run dev
```

### Demo accounts
All accounts use the password `demo1234`.

| Role | Email |
|---|---|
| Admin | admin@skillpass.ng |
| Trainer | babatunde@skillpass.ng |
| Apprentice | tobi@skillpass.ng |
| Employer | folake@skillpass.ng |

The login page also has quick-login buttons for each role.

## Designs

- **Figma:** [paste link]
- **Wireframes:** `docs/wireframes/` [add images]
- **Style guide:** colours, fonts and components are defined in `tailwind.config.js` and `src/index.css`. [add a screenshot of your colour palette and buttons]
- **Database design (ERD):** `docs/erd.png` [add image]
- **Screenshots:**
  - Login: `docs/screenshots/login.png`
  - Trainer: issue credential
  - Apprentice: skills passport
  - Public: verify page
  - Admin: review queue and audit log
  [add screenshots]

## Database schema

Main tables: `users`, `trades`, `skills`, `credentials`, `evidence`, `flags`, `feedback`, `job_postings`, `referrals`, `audit_log`.
Full schema: `database/schema.sql` [add when done].

## Deployment plan

| Part | Service | Notes |
|---|---|---|
| Frontend | Netlify or Vercel | Built with `npm run build`, auto-deploys from GitHub |
| Backend API | Render | Environment variables set in the dashboard |
| Database | Neon or Supabase PostgreSQL | Hosted free tier for the pilot |
| Evidence files | Cloudinary or Supabase Storage | Photos and videos |

Steps:
1. Push the code to GitHub.
2. Create the database and run `schema.sql` and `seed.sql`.
3. Deploy the backend and set the environment variables.
4. Deploy the frontend and point it to the backend URL.
5. Test the full flow with the demo accounts.

## Current status and next steps

- Done: frontend for all roles with seeded demo data, evidence capture, review queue, audit log
- In progress: backend API and database
- Next: move credential signing and the daily issuing limit to the server, connect frontend to the API, deploy

## Author

[Fejiro Obiku]