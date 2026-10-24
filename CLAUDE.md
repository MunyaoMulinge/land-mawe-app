# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Land Mawe: admin portal for a truck/roadshow fleet business (trucks, drivers, bookings, job cards, fuel, maintenance, compliance, invoices/quotations, equipment). Monorepo with a React (Vite) client and a single-file Express server, backed by Supabase (Postgres + Storage). Deployed to Vercel (`vercel.json` serves `client/dist` statically and routes `/api/*` to `server/index.js`).

There are no tests. The only lint config is the client's ESLint.

## Commands

```bash
npm run install:all        # root + client + server deps
npm run dev:server         # server: node --watch index.js, port 3001
npm run dev:client         # vite, http://localhost:5173
npm run build              # client production build (also vercel-build)
cd client && npm run lint  # eslint
```

Local database (Docker + Supabase CLI):
```bash
./scripts/switch-env.sh dev    # supabase start, copies .env.development -> .env
./scripts/switch-env.sh prod   # copies .env.production -> .env (LIVE database; prompts)
supabase db reset && ./scripts/apply-all-migrations.sh
```
Note: `scripts/apply-all-migrations.sh` has a hardcoded `cd /home/munyao/...` path that must be edited for this machine. Local DB is `postgresql://postgres:postgres@127.0.0.1:54322/postgres`; Studio at http://127.0.0.1:54323. `.env.example` documents the local vs. cloud Supabase variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_API_BASE`).

## Architecture

**Server (`server/index.js`, ~3.6k lines, ~70 routes, ESM).** All routes live in this one file. The `.env` is loaded from the repo root by `server/supabase-client.js` (which throws if `SUPABASE_ANON_KEY` is missing). Data access is mostly through the Supabase JS client (`supabase`, and `supabaseAdmin` for storage/service-role operations); `server/db.js` is a legacy `pg` pool. `README.md` still describes an older plain-Postgres setup (`server/schema.sql`); the real schema is `supabase-schema.sql` plus `migrations/`.

**Auth is not token-based.** The client sends the logged-in user's id in an `x-user-id` header and the server looks up the role in the `users` table (see `requireAdmin` in `index.js` and `middleware/permissions.js`). Passwords are bcrypt-hashed in the `users` table. Auth endpoints are rate-limited.

**Permissions (granular `module:action`).** `middleware/permissions.js` exposes `requirePermission(module, action)` (plus `requireAnyPermission` / `requireAllPermissions`) and `checkPermission`. Resolution order: `superadmin` role passes everything → role grants (`role_permissions`) → per-user overrides (`user_permissions`). Role and user lookups are cached in-memory for 5 minutes. Aliases exist (`fuel:create` ≡ `fuel:record`) and are duplicated on the client in `hooks/usePermissions.jsx`; keep both in sync. Adding a permission means a migration inserting into `permissions` (and `role_permissions`), a `requirePermission` on the route, and `hasPermission` gating in the component. See `GRANULAR_PERMISSIONS_GUIDE.md`. Roles include admin, superadmin, finance, driver, staff.

**Client (`client/src`).** React 19 + react-router v7, Formik/Yup (validation schemas in `validations/schemas.js`), GSAP animations, jsPDF for invoices/quotations. `App.jsx` holds the router: a `RequireAuth` layout wraps one route per module, each gated by `usePermissions`, with `/no-access` as the fallback. One component per module in `components/` (Trucks, Bookings, JobCards, Fuel, ...). `hooks/useSession.js` handles idle timeout (warning modal in `IdleWarningModal.jsx`). `config.js` sets `API_BASE` to `/api` in production and `http://localhost:3001/api` otherwise. Components call the API with `fetch` and pass `x-user-id`.

**Database.** Schema changes go in `migrations/NNN_name.sql` (numbered 001–012, plus older unnumbered ones). There is no migration runner; migrations are applied manually (or via the script above) to local and to the production Supabase project, so write them idempotently (`IF NOT EXISTS`, `ON CONFLICT`). Storage bucket/policy setup: `storage_policies.sql`, `SUPABASE_STORAGE_SETUP.md`; document uploads go through multer to Supabase Storage (`DOCUMENT_UPLOAD_FEATURE.md`).

Other root-level `*.md` files are setup/troubleshooting notes (`DEV_WORKFLOW.md`, `DEPLOYMENT_CHECKLIST.md`, `LAND_MAWE_SYSTEM_AUDIT.md`).
