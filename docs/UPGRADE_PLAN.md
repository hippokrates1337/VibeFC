# VibeFC upgrade plan

Review date: 2026-10-18 · Branch reviewed: `architecture/clean-up` (= `main` @ 89cfd1f + ~76 uncommitted files)

Status at review time:

| Check | Result |
|---|---|
| Backend `tsc --noEmit` | ✅ clean |
| Backend jest | ✅ 17 suites / 230 tests |
| Frontend `tsc --noEmit` | ❌ 3 errors, all in test files, pre-existing (would fail `next build` type check) |
| Frontend jest | ✅ 49 suites / 345 tests |
| `next lint` | ❌ cannot run — no ESLint config exists anywhere |
| CI | none (no `.github/`) |
| Local toolchain | `node`/`npx` not on PATH (`C:\nvm4w\nodejs` symlink missing) |

Green tests are misleading: they mock Supabase, `RolesGuard`, and the engine's date handling, so the most serious bugs below are invisible to them.

---

## Phase 0 — Stop the bleeding (do first, ~1 day)

Security and blocking bugs. Nothing else should be merged before these.

1. **Rotate the leaked test-user passwords.** The GitHub repo is **public**. `.env` and `.env.local` were in history from `c9dddcf` to `145c201`.
   - **No database password leaked.** The only `DATABASE_URL` was the placeholder `postgresql://user:password@localhost:5432/vibefc`. No service-role key, JWT secret, Railway or Vercel token was ever committed.
   - **What did leak:** test-user email and password pairs for both Supabase projects (`rfjcfypsaixxenafuxky` and the current `yspnngenawwvocgucxmh`), and both projects' anon keys. The test password for the current project is still the one in use locally.
   - **Anon keys:** they are public by design, because they ship in the browser bundle. The real exposure is item 2.
2. **Close the `variables` RLS hole** (`backend/sql/complete_supabase_setup.sql:351-380`).
   - `"Backend service can view all variables" … USING (true)` has no `TO` role, so anyone with the public anon key can read every org's variables.
   - The INSERT/UPDATE/DELETE policies let any caller write rows whose `user_id` is `'frontend-user'`, `'anonymous'` or `'backend-%'`.
   - Check the live DB with `select * from pg_policies where tablename='variables'`. Drop these policies and replace them with org-membership policies `TO authenticated`.
3. **Fix the uncommitted RolesGuard regression.** The in-flight diff changed `request.user` to `{ userId, email }` (`common/guards/jwt-auth.guard.ts:58`), but `organizations/guards/roles.guard.ts:27,37` still reads `user.id`. Every `@Roles` route now returns 403: member invites, org update/delete, and the new forecast summary endpoint. Change it to `user.userId` and add a `roles.guard.spec.ts`.
4. **Frontend session corruption.** `src/lib/store/organization.ts:55,112,150,253,292,352,389,429` calls `supabase.auth.setSession({ access_token, refresh_token: '' })`. This wipes the refresh token, so users get logged out about an hour later. It also fires `SIGNED_IN`, which re-runs invite claiming. Delete these calls; the client already has the session.
5. **Remove the public debug surfaces.**
   - `/api/env-test` leaks env key names, backend URL and Node version.
   - `src/app/api-test/` is a scaffold page.
   - `/debug-calc` sits in the main nav for every user; put it behind a role or flag.
6. **Middleware bypass.** If the client-controlled cookie `redirect_count` is greater than 5, auth is skipped (`src/middleware.ts:17-26`). Delete the redirect-count hack; it disappears anyway with `@supabase/ssr` in Phase 5.
7. **Cross-tenant debug leak.** `GET /forecasts/:id/debug/calculation-steps` returns the last run's steps for *any* caller, because `DebugCollectorService` is a mutable singleton and the endpoint never checks the forecast id. Short-term: check access and key the steps by `(forecastId, userId)`. Proper fix in Phase 3.

---

## Phase 1 — Land the in-flight work and clean the repo (~1–2 days)

### 1a. In-flight work on `architecture/clean-up`

The uncommitted diff is a coherent clean-up and is mostly complete. Land it as small commits, in this order (use `git add -p` for `auth-provider.tsx`, which mixes themes):

| # | Commit | Notes |
|---|---|---|
| 1 | `fix(backend): RolesGuard reads user.userId` + shared `AuthenticatedRequest` / `@CurrentUser()` | Phase 0 item 3 |
| 2 | `chore(backend): remove orphaned SupabaseService` | also trim `backend/src/supabase/README.md` |
| 3 | `refactor(backend): remove legacy CalculationEngine + USE_NEW_CALCULATION_ENGINE flag` | the deleted `calculation-engine-unified.spec.ts` held the SEED/rules tests; port the scenarios in Phase 3 |
| 4 | `perf(backend): variable lookup indexes in calc context; gate traces behind CALC_ENGINE_VERBOSE_LOGS` | |
| 5 | `perf(backend): batch data-intake insert/update/delete` | |
| 6 | `chore(backend): gate test-auth behind ENABLE_TEST_AUTH_ENDPOINT; x-request-id` | |
| 7 | `feat(backend): GET /organizations/:orgId/forecasts/summary` | node/edge counts are hard-coded `0`: implement them or say so in the commit |
| 8 | `test(backend): edge/node read + 404 e2e` | |
| 9 | `refactor(frontend): structured logger` | 124 `console.*` calls still remain |
| 10 | `refactor(frontend): auth redirect policy → /login` | **decide**: delete the unreachable guest landing branch in `src/app/page.tsx`, or special-case `/` |
| 11 | `refactor(frontend): useOrganizationForecastsLoader` | bug: returns early when the list is non-empty, so **switching org shows the previous org's forecasts**. Key the list by orgId. |
| 12 | `refactor(frontend): shared variables proxy utils; drop frontend-user route` | |
| 13 | `chore(frontend): remove modal-provider/date-picker/bulk-save flag` | also delete the now-unreachable `saveForecastGraphLegacy` (`src/lib/api/forecast.ts:369`) |
| 14 | `test(frontend): align tests with forecast-graph-store hooks` | |
| 15 | `test(e2e): Playwright webServer for both apps, login helper` | drop the `babel-plugin-transform-typescript-metadata` and Nest-Logger shim in `setupTests.ts`; both are leftovers |

### 1b. Branches

All feature branches are fully merged by content: the two `forecast-display` branches have trees identical to the squashed PR #31. Delete locally and on `origin`: `bugfix/database-setup`, `feature/usability-improvements`, `feature/forecast-display-clean`, `feature/forecast-display`, `backup/forecast-display`, and the local `github` (its remote is gone).

### 1c. Repo hygiene

- **Untrack generated output** (`git rm -r --cached`) and add it to `.gitignore`: `backend/dist/`, `coverage/` (12 MB), `playwright-report/`, `test-results/`, `*.tsbuildinfo`, `/debug-*.png`, `.env*` (with `!.env.example`). First confirm the backend host doesn't deploy from the committed `dist/`. No deploy config in the repo references it.
- **Delete root clutter:** `verify-isolated-approach.js`, `update-test-imports.{js,ps1}`, `successful-import.png`, `jest-setup.ts` (not referenced), `setup-env.js` (replace it with `.env.example` files), `packages/shared-types` (imports Prisma, imported by nothing), and the `types:build` / `prisma:generate` scripts.
- **Tailwind:** two configs exist. Tailwind 3 loads `.js`, so `tailwind.config.ts` (and its safelist) is dead, yet `components.json` points at it. Keep one config.
- **Dependencies:** remove the unused `prisma`, `@prisma/client`, `vitest`, `msw`, `cloc`, `web-streams-polyfill`, `node-domexception`, `cross-fetch`, `zod` (unless adopted), and `@nestjs/passport` / `passport`. Move the test and Babel packages to `devDependencies`.
- **Move the repo out of OneDrive** (e.g. `C:\dev\VibeFC`). Syncing `node_modules`, `.next` and `dist` causes the EBUSY/EINVAL errors and made every tool run here take minutes. Fix the Node install (nvm-windows symlink) or use `fnm`/Volta, and pin the version with `.nvmrc` plus `"engines"`.

### 1d. Minimum CI (GitHub Actions)

`npm ci` → `tsc --noEmit` (root + backend) → ESLint → jest (root + backend), on every PR. Fix the 3 frontend TS errors first:

- `ForecastToolbar.test.tsx:278`
- `node-value-overlay.test.tsx:9`
- `fiscal-year-metric-totals.test.ts:10`

Add an ESLint 9 flat config (`typescript-eslint` + `eslint-config-next`) at the root and for `backend/`.

---

## Phase 2 — Docs modernization and AGENTS.md (~0.5 day)

### Do you still need per-folder READMEs? No.

There are **49 tracked README.md files** (~3.8k lines in `src/` alone). Most are stale:

- They document ~30 hooks that don't exist.
- They describe "HTTP-only cookies" that are actually JS-readable.
- They list deleted files (`modal-provider`, `frontend-user`, `SupabaseService`).
- They claim Server Components are the default, while 56 of 77 `.tsx` files are `"use client"`.

Per-folder READMEs were a workaround for older tools that couldn't search a codebase. Current coding agents read the code directly. Stale prose now does harm, because agents trust it over the code.

Keep:

- `README.md` (root): what the product is, a quickstart, and links. No changelog ("Phase 8 Complete"), no fork boilerplate. Fix the license line (the file is **GPL-3.0**, the README says MIT), and the `yarn` / `prisma db push` / `.env.example` instructions that don't match reality.
- `docs/architecture.md`: one page with the system diagram, data paths, auth model and the tenant-isolation model.
- `docs/forecast-engine.md`: calculation **semantics** (node types, lag/seed rules, missing-data rules, period model). This is the one place where prose has real value, because it is a spec, not a code tour.
- `docs/adr/NNN-*.md`: short decision records for big choices (engine rewrite, single data path, migrations).
- `tests/e2e/README.md` → merge it into AGENTS.md's testing section.

Delete all other per-folder READMEs, `src/test-utils.md` and `integration.test.md`. Replace `.cursor/rules/*.mdc` with AGENTS.md: their front-matter is broken (empty first YAML block, so they never auto-attach), and they encode rules the code doesn't follow (Prisma, Passport, "avoid enum", nuqs, Server Components by default).

### How to write a best-practice AGENTS.md

Principles:

1. **Short and high-signal** (~100–150 lines). It is loaded into every agent session, so every line costs context and attention.
2. **Exact, copy-pasteable commands**, including how to run a *single* test and what "done" means (typecheck + lint + tests).
3. **Only non-obvious facts.** Invariants, gotchas and boundaries. Skip what the agent can infer from `package.json` or the code ("we use TypeScript").
4. **Point, don't duplicate.** Link to `docs/forecast-engine.md` instead of restating it.
5. **Boundaries and safety.** What never to touch, what never to commit, where secrets live, which DB the tests hit.
6. **Nested files for sub-areas.** Add `backend/AGENTS.md` and `packages/forecast-engine/AGENTS.md` once those exist, with module-specific rules. Agents read the closest file.
7. **One source for every tool.** Create `CLAUDE.md` containing just `@AGENTS.md`, and drop the `.cursor/rules` copies. Cursor, Codex and Copilot read AGENTS.md natively.
8. **Treat it as code.** Update it in the same PR that changes a convention. Review it when the architecture phases land.

Draft for **after Phase 1** (update the Architecture section as Phases 3–5 land):

```markdown
# AGENTS.md

VibeFC: multi-tenant financial forecasting. Users import time-series variables,
model forecasts as a node graph (React Flow canvas), and the backend evaluates the
graph per month.

## Layout
- `src/` — Next.js App Router frontend (client components + zustand stores)
- `backend/` — NestJS API (npm workspace). Only the backend computes forecasts.
- `backend/sql/` — Supabase schema + RLS (→ `supabase/migrations/` after Phase 4)
- `tests/e2e/` — Playwright, runs both apps
- `docs/` — architecture, forecast-engine semantics, ADRs

## Commands (run from repo root unless noted)
- Install: `npm ci`
- Dev: `npm run dev` (web :3000) and `npm run backend:dev` (api :3001)
- Typecheck: `npx tsc --noEmit` and `npx tsc --noEmit -p backend`
- Lint: `npm run lint` · `npm run lint -w backend`
- Unit tests: `npm test` (frontend) · `npm test -w backend`
- Single test: `npx jest path/to/file.test.tsx -t "name"` (backend: `-w backend`)
- E2E: `npm run test:e2e` — needs `.env.local` + `backend/.env`, hits a real Supabase project

Done = typecheck + lint + unit tests pass for every workspace you touched.

## Architecture rules
- Browser → NestJS for all domain data. The browser talks to Supabase only for auth.
- Tenant isolation: every query is scoped by organization. Backend uses a per-request
  Supabase client carrying the user JWT, so RLS applies. Never use the service-role
  client outside the invites flow.
- Auth: `JwtAuthGuard` sets `request.user = { userId, email }` (type `AuthenticatedRequest`,
  `@CurrentUser()`). Use `@Roles('admin'|'editor')` for writes. Viewers are read-only.
- Child resources (nodes, edges) are always queried with their parent `forecast_id`.
- Periods are `MM-YYYY` strings, handled in UTC only. Never `new Date(y, m, 1)` (local time).
- Forecast semantics (node types, SEED/lag, missing data): see docs/forecast-engine.md.

## Conventions
- Frontend logging: `logger.info(event, ctx)` from `@/lib/utils/logger`, no `console.*`.
- Backend: controller → service → (repository); DTOs with class-validator; throw Nest
  HttpExceptions, never raw `Error`; don't echo DB error text to clients.
- Tests live next to code in `__tests__/` (frontend) or `*.spec.ts` (backend).
- Don't add per-folder READMEs. Update docs/ when behaviour changes.

## Gotchas
- Repo path contains spaces; quote paths in scripts.
- `tsconfig` is incremental: don't commit `*.tsbuildinfo`.
- The forecast-graph store is persisted to localStorage; changing its shape needs a
  `version` bump + `migrate`.

## Never
- Commit `.env*`, `passwords.txt`, `backend/dist/`, `coverage/`, test reports.
- Edit `backend/sql/*` policies without a migration and a policy test.
- Run backend e2e against production; they create and delete auth users.
```

---

## Phase 3 — Rewrite the forecast engine (the "circular dependency" bugs) (~1–2 weeks)

### What is actually wrong

The engine evaluates **tree by tree**. Each METRIC becomes a root, and trees are ordered by SEED references (`calculation-engine/services/tree-processor.ts:38-71`). That ordering treats a SEED reference, which always means *previous month* (t-1), as if it were a *same-month* dependency. Five confirmed defects follow:

1. **Valid recurrences are rejected as cycles.** `M1 = SEED(M2) + 1`, `M2 = SEED(M1) + 1` throws "Circular cross-tree SEED dependency" (`tree-processor.ts:59-62`), even though it is well-founded per month.
2. **The canvas invites a real cycle.** `SeedNode` has a target handle (`SeedNode.tsx:59-64`), so users draw Metric → SEED. That creates a genuine cycle, which validation rejects without saying which nodes are involved. Nothing is checked at connect time (`forecast-canvas.tsx:104-108`, no `isValidConnection`).
3. **Self-seed only works for forecast.** It goes through the `runningMetricForecasts` side map. Historical and budget runs return `null` for a `useCalculated` metric `M = SEED(M) + 5` (`seed-node-strategy.ts:284-329`).
4. **DAGs are squashed into trees.** Shared nodes become reference stubs with `children: []` (`graph-converter.ts:312-324`). A stub evaluated first caches `null` for the real node, so `M = X + offset(X)` gives Jan = `null` or `12` depending on **edge order**.
5. **Off-by-one month on any non-UTC machine.** `PeriodService` builds local-time dates (`period-service.ts:116,138`) and `VariableDataService` reads them with UTC getters (`variable-data-service.ts:77-80`). In Berlin, `01-2025` reads December's data. Production on Vercel (UTC) is fine; your laptop is not. The UTC-correct `MMYYYYUtilsService` exists but isn't used by the engine.

Also:

- **Sign conventions disagree:** a DATA offset is a lead, an OPERATOR offset is a lag.
- **Missing data silently becomes `0`.**
- **Operand order of non-commutative operators** (`-`, `/`, `^`) is rebuilt from edge-array order on every edit, and the backend loads edges without `ORDER BY`.
- **The frontend fork of `GraphConverter` has diverged** from the backend's, so the two validations can disagree.
- **`DebugCollectorService` and `CalculationCacheService` are mutable singletons.**
- **A hidden evaluator↔strategy cycle** is solved by smuggling `nodeEvaluator: this` through the context object.

### Target design

1. **A new `packages/forecast-engine`.** Pure TypeScript, no Nest or React dependencies, synchronous, deterministic. The backend wraps it in a thin Nest service. The frontend imports the *same* validation (and, optionally, live preview). It replaces the frontend `GraphConverter` fork and the 3+ duplicated type sets.
2. **A normalized graph, not trees.** Nodes in a `Map`, plus an input list per node with an explicit **`rank` column on `forecast_edges`** (DB migration).
3. **Temporal edges are explicit.**
   - Every edge carries `lag ≥ 0`.
   - SEED becomes "metric M at lag 1, base case = M's historical value". In the UI, drawing Metric → SEED creates a lag-1 edge instead of a cycle.
   - The OPERATOR offset becomes a lag edge.
   - One sign convention: positive lag = past. Migrate the DATA `offsetMonths` values to it.
4. **Validation.**
   - Drop the lag ≥ 1 edges, then require the **same-period graph to be acyclic** (Tarjan SCC). Report `{code, nodeIds, path}` so the UI can highlight the cycle.
   - Run the same check in `isValidConnection` while the user drags an edge.
5. **Evaluation.**
   - Topologically sort once.
   - For each month in order (actual months, then forecast months) and each calc type (historical / forecast / budget), evaluate nodes in that order into a **request-local memo** keyed `(nodeId, period, type)`.
   - Lag edges read `memo[src, period − lag]`. Before the window starts, they read historical or seed data.
   - No recursion, no tree ordering, no stubs, no singleton cache.
6. **Dates as integer month indices** (`year*12 + month`). MM-YYYY strings only at the API boundary.
7. **Explicit missing-data rule:** `null` propagates by default, with an optional per-node "treat missing as 0".
8. **Debug trace as a return value** (a list of steps). That deletes `DebugCollectorService` and fixes the tenant leak.

### Migration path

1. Write `docs/forecast-engine.md` (the semantics spec) first, and settle the open semantic questions in it.
2. Build a test corpus first:
   - golden tests for growth, cross-metric recurrences, diamonds, offset-over-shared-node, a gap between the actual and forecast windows, and missing data;
   - **property-based tests** with `fast-check`: random DAGs with lag edges, results checked against a naive reference evaluator, and results must not change under edge or node order permutations;
   - every run under `TZ=UTC` and `TZ=Europe/Berlin`.
   - Port the scenarios from the deleted `calculation-engine-unified.spec.ts`. Also fix `testRegex` so `forecast-calculation-integration.test.ts` actually runs.
3. Implement the package and run old and new engines side by side behind a flag, diffing their results.
4. Switch over, then delete `GraphConverter`, `TreeProcessor`, the strategies' recursion, `CalculationCacheService`, `DebugCollectorService`, `CalculationAdapter`, `PeriodService`'s local-time helpers, the dead service methods (`calculateForecast`, `calculateHistoricalValues`, `executeComprehensiveCalculation`, …), and the dead frontend API calls (`/calculate`, `/calculation-results`).

Keep: the arithmetic in `performOperation`, the per-calc-type variable rules (`data-node-strategy.ts:90-104`), the `MonthlyValue` / unified result DTO shapes, `MMYYYYUtilsService`, and the controller layer.

---

## Phase 4 — Backend architecture (~1–2 weeks, can overlap Phase 3)

1. **One data path.** Today:
   - variables go browser → Next `/api` proxy → Nest;
   - forecasts go browser → Nest directly;
   - organizations and members go **browser → Supabase tables directly** (`organization.ts`, ~10 `.from()` calls), next to duplicate Nest endpoints.

   Recommendation: **browser → Nest for all domain data; Supabase in the browser for auth only.** Delete the Next `/api/data-intake` proxy, or reduce it to one generic proxy if you need same-origin. Move org/member CRUD behind Nest. That also fixes `POST /organizations`, which currently passes the userId as an email (`organizations.service.ts:48`).
2. **Supabase CLI migrations** (`supabase/migrations/`) replace the 827-line paste-into-SQL-editor script.
   - Rewrite RLS: `TO authenticated` everywhere; role-aware helpers (viewers read-only: today **viewers can modify forecasts, nodes and edges**); no `USING(true)`; no magic `user_id` strings.
   - Add the missing indexes (`organization_members(user_id)`, `forecasts(organization_id)`, `forecast_nodes(forecast_id)`, `forecast_edges(forecast_id, source, target)`).
   - Add constraints: `variables.organization_id NOT NULL`, `user_id uuid`, and edges' nodes must belong to the edge's forecast.
   - Add **pgTAP policy tests**, run against a local `supabase start` stack in CI. Never run tests against the shared project.
3. **Auth.**
   - Register `JwtAuthGuard` as a global `APP_GUARD` with a `@Public()` opt-out.
   - Verify JWTs locally against Supabase JWKS (`jose`) instead of an `auth.getUser()` network call per request.
   - Use one **OrgAccessGuard**: it resolves the org from the route *or* from the forecast id, loads the role once, and enforces `@Roles` on forecast routes too.
4. **Scope children by parent.** Nodes and edges are currently fetched by `nodeId` only (`forecast.controller.ts:128,143,157,193,207`). Add `ParseUUIDPipe` on every id.
5. **Data-intake.**
   - Stop trusting client-supplied `userId`, `user_id` and `organizationId`.
   - Load only the forecast's org variables for a calculation, not all of the user's.
   - Fix the local-time `setDate(1)` bug (`data-intake.service.ts:299-315`), which stores `2024-03-01` as Feb 29 on CET hosts.
   - Use `eq` on normalized emails instead of `ilike` for invites: `_` and `%` act as wildcards.
6. **Repository layer.** Only repositories touch `SupabaseClient`. Get a request-scoped user client. Delete the `SUPABASE_ADMIN_MODE` and `IS_TEST_ENVIRONMENT` modes: admin mode silently disables tenant isolation, and `setAuthContext` calls an RPC that doesn't exist. Move multi-step writes (create org, bulk graph save) into transactional RPCs.
7. **Cross-cutting.**
   - Validate env with zod in `ConfigModule`.
   - Add helmet, a CORS allow-list (today any origin is allowed), `@nestjs/throttler` (on the calculate and invite endpoints especially), and a global exception filter that maps PostgREST errors to 4xx with sanitized messages; today raw DB error text is returned to clients.
   - Use `nestjs-pino` for structured logs with request ids.
8. **Contract-first API.** `@nestjs/swagger` → OpenAPI → `openapi-typescript` generates `packages/api-contract`, which the frontend consumes. This deletes the hand-copied frontend types (`forecast-graph-store/types.ts`, `forecast-calculation.ts:95`, …).
9. **Deployment.** Document where the backend runs (it isn't in the repo). Add a Dockerfile or platform config, and build in CI rather than committing `dist/`.

---

## Phase 5 — Frontend architecture and framework upgrades (~1–2 weeks)

1. **Auth via `@supabase/ssr`.**
   - HttpOnly cookies, with token refresh in middleware/`proxy.ts`.
   - One browser client and one server client factory (`lib/supabase/{client,server}.ts`).
   - Delete the hand-written JS-readable `sb-access-token` cookie, the three copies of cookie-parsing `fetchWithAuth`, the second Supabase client in `debug-calculation.ts`, and the server-side use of the browser singleton in `auth/callback/route.ts`.
2. **One typed `apiClient`**, generated from the OpenAPI contract.
3. **TanStack Query for server state** (orgs, members, variables, forecast list and detail, results), with `orgId` in every query key. That fixes stale data after an org switch, the fetch-once guards in `variables.ts:78-85`, the double fetching in `AuthProvider` + `ProtectedLayout`, and the forecast list being empty on direct load of `/forecast-display`. Stop persisting server data to localStorage.
4. **Editor store scoped per forecast** (canvas nodes and edges, selection, dirty flag). Today:
   - **Opening Display or Debug calls `loadForecast()` on the shared store and silently discards unsaved edits** (`forecast-display/page.tsx:165-170`, `debug-calc/page.tsx:476`).
   - Reload-preservation can't work, because `isDirty` isn't persisted (`store.ts:45-55`), and hydration runs three times.

   Replace this with an explicit `forecast-draft:{id}` persisted draft, or autosave. The display and debug pages read Query data only.
5. **Performance.** `useForecastGraphActions` subscribes to the whole store (`use-forecast-graph.ts:33`), and `AuthProvider` uses it with an unmemoized context value, so every node drag re-renders the app. Use selectors with `useShallow`.
6. **Split the large files** into feature folders (`features/forecast-editor`, `forecast-results`, `debug`, `data-intake`, `organizations`). 15 files exceed 400 lines; the biggest are `step-execution-log.tsx` (832), `debug-calc/page.tsx` (774), `lib/api/forecast.ts` (725), and the toolbar, config panel and results table (~690 each).
7. **Server/client boundaries.** Server-rendered layouts read the session, client islands handle the canvas and forms, plus `loading.tsx` and `error.tsx` per segment.

### Upgrade sequence (each step its own PR, CI green in between)

1. **Node 22/24 LTS** pinned, ESLint 9 flat config, a single test runner. Keep Jest via `next/jest` (SWC) and delete `babel.config.js`, the decorator plugins, `jest-globals-setup.js` and the polyfills; or move everything to Vitest. Pick one, not both.
2. **Next 14.1 → 15.**
   - `params` and `cookies()` become async (`api/data-intake/variables/item/[id]/route.ts`, `user/[userId]/route.ts`, `auth/callback/route.ts`).
   - Remove `swcMinify`.
   - Route-handler caching defaults change.
3. **React 18 → 19**, with `@testing-library/react` 16, `@types/react` 19, and a newer `lucide-react`.
4. **Next 15 → 16.**
   - Rename `middleware.ts` → `proxy.ts`.
   - `next lint` is removed (use the ESLint CLI).
   - `publicRuntimeConfig` is removed (`supabase.ts:27`).
   - Turbopack becomes the default (needs Babel gone).
5. **`reactflow` 11 → `@xyflow/react` 12.**
   - Named `ReactFlow` import and new CSS path.
   - Typed `NodeProps<Node<T>>` in the 5 node components, `RankedEdge`, `node-types.ts` and the store types.
   - Update the 11 test files that mock `'reactflow'`.
6. **Tailwind 3 → 4.**
   - CSS-first `@theme` and the `@tailwindcss/postcss` plugin.
   - `tailwindcss-animate` → `tw-animate-css`.
   - Regenerate the shadcn components, including `calendar.tsx`, which is written for react-day-picker **v8** while v9 is installed. The type errors are hidden by a `[key: string]: any` shim in `src/types/react-day-picker.d.ts`.
7. **Backend:** Nest 10 → 11, `@nestjs/config` 4, `reflect-metadata` 0.2, `supertest` 7.

**Optional monorepo restructure** (do it once things are stable): `apps/web`, `apps/api`, `packages/forecast-engine`, `packages/api-contract`. Today the frontend *is* the root package, which is why root Jest, Babel and tsconfig keep tripping over `backend/`. pnpm + Turborepo is optional; npm workspaces are fine at this size.

---

## Phase 6 — Finish the current scope (open issues)

| Item | Status | Plan |
|---|---|---|
| **#28 Historical calculation unsolved** | engine computes historical values for forecast months; no explicit "actual period" | Falls out of Phase 3. Each forecast has an explicit actual window and forecast window. Historical is computed only for actual months (needed to back-test the graph against actuals), forecast only for forecast months, budget for both. The display layer stitches actual + forecast. Specify this in `docs/forecast-engine.md` first. |
| **#21 Forecast deletion** | API `forecastApi.deleteForecast` exists, no UI calls it | Add it to the forecast-definition card menu with a confirm dialog, and invalidate the list query. Make sure nodes, edges and results `ON DELETE CASCADE`. Admin/editor only. |
| **#22 Variable filtering** | not implemented | Client-side search + type filter on the variables list; URL state via `nuqs` or search params. |
| **#23 Add datapoints to variables** | only existing points editable | Add-row in the variable details modal; backend `PATCH` validates unique months (UTC month index). |
| **#24 Manually defining variables** | upload-only | "New variable" dialog (name, type, optional initial points), reusing the #23 editor. |
| Forecast summary counts | hard-coded `0` (`forecast.service.ts:430-441`) | Aggregate count query or view; or drop the preview. |
| Guest landing page | unreachable after the redirect change | Decide: delete it (simplest) or make `/` public, with a special case for authenticated users. |
| `debug-calc` | in the main nav for all users | Feature flag / admin role, or fold it into a "trace" tab of the display page once the engine returns traces. |
| Operand order persistence | rebuilt from edge array order | `rank` column (Phase 3 step 2) + drag-to-reorder in the operator config panel. |
| Connect-time validation | none | `isValidConnection` using the shared engine validator; highlight the cycle path. |

---

## Suggested order and parallelism

```
Phase 0 ─▶ Phase 1 ─▶ Phase 2
                │
                ├─▶ Phase 3 (engine)  ──┐
                ├─▶ Phase 4 (backend)  ─┼─▶ Phase 6 (scope)
                └─▶ Phase 5 (frontend) ─┘
```

Phases 3, 4 and 5 touch mostly disjoint code and can run in parallel once Phase 1 has landed and CI exists. Within Phase 5, do the framework upgrades *after* items 1–4: those delete a lot of code you'd otherwise upgrade for nothing.

## Open questions for the owner

1. Where is the NestJS backend deployed? This decides whether untracking `backend/dist/` is safe and what deploy config to add.
2. Does the live Supabase DB still have the `variables` policies from `complete_supabase_setup.sql`?
3. Guest landing page: keep or delete?
4. Engine semantics: should missing data be `null` (propagate) or `0` by default? Should budget be computed for actual months?
