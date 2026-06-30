# Luxar LMS

Cloudflare full-stack exam-prep LMS. See `../LUXAR-LMS-PLAN.md` for the master plan.

**Stack:** React (Vite) → Pages · Hono → Workers · D1 (SQLite) · R2 + Stream · Razorpay · Firebase Auth · LiveKit Cloud (live, last).

## Monorepo layout
```
apps/
  web/    React + Vite SPA  (Cloudflare Pages)
  api/    Hono Worker        (Cloudflare Workers)  — D1, sessions, Firebase verify, RBAC
packages/
  db/     Drizzle schema + D1 migrations + seed
  shared/ Shared TS types + Zod schemas
```

## Phase 0 — what's here
Foundation: monorepo, design palette, 4 surface shells (public / student / trainer / admin),
full D1 schema + migration + seed, Firebase auth (Google + email/password) → Worker token
verification → cookie session, RBAC, **first registered user becomes admin**, audit log.

## Cloudflare resources (account: z3connect.operations@gmail.com)
- **D1** `luxar-lms` — id `93347791-0ec6-47cd-8d1d-d036726450fa` (region APAC). Wired in `apps/api/wrangler.toml`.
- **R2** bucket `luxar-lms-media` — binding `BUCKET`.
- Remote DB is migrated + seeded. Use `--remote` on wrangler d1 commands to target it; `wrangler dev` uses local state by default.

## Local setup
```bash
npm install

# 1) Create local D1 + apply migrations
npm run db:generate            # generate SQL migration from schema
npm run db:migrate:local       # apply to local D1

# 2) Run API worker (terminal 1)  -> http://localhost:8787
npm run dev:api

# 3) Run web (terminal 2)        -> http://localhost:5173
npm run dev:web
```

### Required config (fill before login works)
- **Web** `apps/web/.env.local`: Firebase web config (`VITE_FIREBASE_*`) + `VITE_API_URL`.
- **API** `apps/api/.dev.vars`: `FIREBASE_PROJECT_ID`, `SESSION_SECRET` (any random string).
  Copy from the `.example` files and fill in your Firebase project values.

Enable **Google** and **Email/Password** providers in the Firebase console.
