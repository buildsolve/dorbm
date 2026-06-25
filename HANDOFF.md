# CakeERP — Session Handoff Context

Paste this whole file content as the first message to a new session to resume seamlessly.

## What this project is
NestJS backend + React/Vite frontend, "CakeERP" — cake production ERP (recipes, inventory,
weekly production planning, dashboards). Originally SQLite, migrated to PostgreSQL on Railway
for real business use (~10 users).

## Repo & branch state
- GitHub: https://github.com/buildsolve/dorbm (private)
- **`master` is the only active branch** — Postgres migration is fully merged in.
- Tag `legacy-sqlite-baseline` marks the pre-migration SQLite state (safety net, not active).
- Local working copy: `C:\Users\Public\cakeerp`
- Node (portable, not on PATH by default): `C:\Users\User\nodejs-portable\node-v20.11.1-win-x64\node.exe`
  — prepend to `$env:PATH` in PowerShell before running npm/npx/node directly.

## Infrastructure
- **Railway project**: `pacific-healing` (workspace: buildsolve's Projects)
- **Service**: `dorbm` — this is the deployed backend+frontend (single deployable)
- **Production URL**: https://dorbm-production.up.railway.app
- **Postgres**: single Railway Postgres instance, two databases on it:
  - `railway` — production data (real business data, do not touch carelessly)
  - `cakeerp_dev` — local dev database, seeded with a copy of real data, isolated from prod
- Public Postgres connection (for local `.env` / scripts):
  `postgresql://postgres:CnXeuldrMovnpocUQkWEwCPxheCOVjew@reseau.proxy.rlwy.net:59376/<dbname>`
- Local backend `.env` (`backend/.env`) points `DATABASE_URL` at `cakeerp_dev`.
- Railway service env vars already set: `DATABASE_URL` (internal `postgres.railway.internal`),
  `JWT_SECRET`, `JWT_EXPIRES_IN=24h`, `NODE_ENV=production`, `PORT=4000`.
- Railway CLI is installed (`npm install -g @railway/cli`) and was authenticated as
  `sharma.mayank.qa@gmail.com` via `railway login --browserless`. If a new session needs it,
  check `railway whoami` first — it may already be authenticated on this machine.
- CLI link state lives in `C:\Users\User\.railway\config.json`, keyed by directory. Both
  `C:\Users\Public\cakeerp` and `C:\Users\Public\cakeerp\backend` are linked to
  project `pacific-healing` / service `dorbm`.

## Critical quirks learned the hard way (don't redo this debugging)
1. **Railway's "Root Directory" setting cannot be relied on / kept reverting to `backend`,
   and even when set, it restricts the build context to ONLY that folder** — so the backend's
   build process cannot reach the sibling `frontend/` folder during a Railway build, regardless
   of builder (Dockerfile or Nixpacks).
   - **Fix in place**: the frontend is pre-built locally and the output is committed directly
     into `backend/public/` (NOT gitignored — see `.gitignore`, it was deliberately removed
     from there). NestJS serves it via `ServeStaticModule` (see `backend/src/app.module.ts`).
     **Any frontend change requires rebuilding and recommitting `backend/public` before
     deploying** — Railway does not rebuild the frontend itself.
2. `backend/Dockerfile` was renamed to `backend/Dockerfile.docker-compose-only` — keep it that
   way. Its presence as `Dockerfile` causes Railway to auto-detect and use Docker build
   (ignoring Nixpacks build/start command settings), which can't work for the reason above.
3. `backend/railway.json` is config-as-code for Railway (builder=NIXPACKS, buildCommand=
   `npm run build`, startCommand=`npm run start:prod`). This is more reliable than the Railway
   dashboard's Build/Start Command fields, which have reset/reverted unexpectedly multiple times.
4. `backend/tsconfig.json` has explicit `rootDir: "./src"` and `include`/`exclude` — without
   this, `nest build` outputs to `dist/src/main.js` instead of `dist/main.js` (because
   `prisma/seed.ts` sits outside `src/` and skews TypeScript's inferred rootDir). Don't remove.
5. Railway's Nixpacks build image lacks `/bin/sh` (only `/bin/bash` exists). Any script using
   Node's `execSync`/`spawnSync` must pass `{ shell: '/bin/bash' }` explicitly — see
   `backend/scripts/copy-frontend.js` for the pattern.
6. `railway up` (CLI deploy) filters the uploaded snapshot using `.gitignore`, **independent of
   git tracking** — so even committed files get excluded if `.gitignore` still lists them.
7. GitHub-based auto-deploy on Railway was unreliable (stuck branch picker, "GitHub Repo not
   found" UI bug, kept defaulting to the wrong branch). **We bypass it entirely** and deploy via
   `railway up` (CLI direct upload) instead. The GitHub repo connection in Railway's dashboard
   may still show as connected/broken — ignore it, it's not used for deploys anymore.
8. Local Windows quirk: stale Prisma/TS incremental build caches cause
   `Error: Cannot find module './common/prisma/prisma.module'` — fix is always
   `Remove-Item -Recurse -Force dist; Remove-Item -Force tsconfig.tsbuildinfo` before rebuilding.
9. Switching the Prisma schema's datasource (sqlite vs postgresql) requires regenerating the
   Prisma client (`npx prisma generate`) afterward — the generated client embeds the schema and
   will throw confusing validation errors otherwise.

## How to deploy a change
From repo root (`C:\Users\Public\cakeerp`), with Node on PATH:
```powershell
.\deploy.ps1
```
This builds the frontend, copies it into `backend/public`, commits, pushes to GitHub, and runs
`railway up -c` to deploy. Takes a few minutes; watch for `Exit code: 0` as success signal.

To deploy manually instead:
```powershell
$env:PATH = "C:\Users\User\nodejs-portable\node-v20.11.1-win-x64;" + $env:PATH
cd C:\Users\Public\cakeerp\backend
npm run build:full          # builds frontend, copies to backend/public, builds backend
cd ..
git add -f backend/public; git add -A; git commit -m "..."; git push origin master
railway up -c               # MUST run from repo root (C:\Users\Public\cakeerp), not backend/
```

## Local dev workflow
```powershell
$env:PATH = "C:\Users\User\nodejs-portable\node-v20.11.1-win-x64;" + $env:PATH
cd C:\Users\Public\cakeerp\backend
node dist/main.js            # after building — runs against cakeerp_dev Postgres DB
```
Frontend dev server: `cd frontend; npm run dev` (Vite, proxies `/api` to `localhost:4000`).

Login credentials (same on local dev and prod): `admin@cakeerp.com` / `admin123`.

## Verifying things work
```powershell
$t = (Invoke-RestMethod -Uri 'https://dorbm-production.up.railway.app/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"admin@cakeerp.com","password":"admin123"}').access_token
Invoke-RestMethod -Uri 'https://dorbm-production.up.railway.app/api/dashboard/business-outlook?window=week' -Headers @{Authorization="Bearer $t"}
```
Expect: ~800 units, ~53h labour, ~67.9% capacity utilization (current real KW27 plan data) —
if these numbers come back, prod is healthy.

## What's NOT done yet / possible next steps
- GitHub auto-deploy is not actually wired up (CLI-only deploys for now). Could revisit later
  with a GitHub Action that does what `deploy.ps1` does, if reliability improves.
- No CI/tests gating deploys.
- Frontend bundle is large (1.1MB main chunk) — Vite warns about this; not yet code-split.
- `npm audit` shows ~45-47 vulnerabilities in backend deps (pre-existing, not introduced by
  this migration) — not yet addressed.
