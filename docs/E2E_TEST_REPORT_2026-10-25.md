# VibeFC end-to-end test report

Test date: 2026-10-25 · Code under test: `main` @ `d8aa8bc` (includes PR #35 DAG forecast engine and PR #36 canvas graph checks) · Tester: Claude, with the test user `testuser@dummydomain.org`

Companion to [UPGRADE_PLAN.md](UPGRADE_PLAN.md), which is a static review. This report covers what the running application actually does, measured against synthetic data with known expected values.

## 1. Scope and method

| Layer | How it was exercised |
|---|---|
| Unit suites | Engine (UTC and Europe/Berlin), backend, frontend, all typechecks |
| Backend API | Direct calls against two local backends from the same build: `:3001` in the machine's zone (Europe/Berlin) and `:3002` with `TZ=UTC` |
| Frontend | Next dev server, driven in a real browser: org management, CSV upload, variable editor, forecast editor (canvas), forecast display |
| Database | Live Supabase project `yspnngenawwvocgucxmh`, RLS probed as anonymous and as the test user |

All synthetic data lives in the organization **E2E Test 2026-10-24** (created for this test).

### Synthetic data

Fixtures are in `tests/e2e/fixtures/synthetic/` (regenerate with `node tests/e2e/fixtures/synthetic/generate.mjs <dir>`).

- `e2e-main.csv`: 9 variables covering all four types over 24 months (2025-01 to 2026-12). Every month has a different value, so a one-month shift is always visible. It includes a deliberate gap (`Gappy`, June 2026 missing).
- `e2e-german.csv`: semicolon delimiter, `dd.MM.yyyy` headers, German numbers (`1.235,56`).
- `e2e-edge.csv`: CRLF line endings, `MM/yyyy` headers, a lower-case type, negative numbers, scientific notation, a quoted name containing a comma, a duplicate variable name, and a quoted thousands separator.
- `e2e-ambiguous-dates.csv`: `03/04/2026` and `13/04/2026` in one file.

### Forecast scenarios (expected values computed independently)

| Scenario | What it checks |
|---|---|
| A_arith | `Units × Price`; historical and budget variables on a non-calculated metric |
| B_growth | `SEED(M) × (1 + Growth)` recurrence; base case from Dec actual |
| C_ops | `−`, `/`, `^` operand order via `inputOrder`; division by zero |
| D_offsets | lag (`offset`), lead (DATA `offsetMonths`), diamond `X + offset(X)`; re-saved with reversed node/edge order |
| E_missing | missing month → `null`; `missingAsZero` → `0` |
| F_cross | `A = B[-1]+1`, `B = A[-1]+1` (cross-metric recurrence) |
| G_selfseed | `M = M[-1]+5` with `useCalculated` for historical, forecast and budget |
| H_types | UNKNOWN/ACTUAL/BUDGET variable-type rules per calc type |
| K_overlap / L_gap | actual window overlapping / separated from the forecast window |
| V_invalid | 11 invalid graphs (cycle, `^` with 3 inputs, no metric, …) |
| PERF | 142 nodes, 160 edges, 20 recurrences, 72 months |
| UI-built | Forecast created entirely on the canvas (add, connect, configure, save, calculate) |

## 2. Results at a glance

| Area | Result |
|---|---|
| Engine unit tests | ✅ 64/64 under UTC and Europe/Berlin |
| Backend unit tests | ✅ 16 suites / 234 tests |
| Frontend unit tests | ✅ 50 suites / 350 tests, but only after excluding `.claude/worktrees/` (see L11) |
| Typecheck (frontend, backend, engine) | ✅ clean |
| Production `next build` | ✅ builds in about 90 s (not part of CI) |
| **Calculation accuracy** | ✅ **2,547 value checks, 0 mismatches** (10 scenarios + PERF). Identical results from the Berlin and UTC backends. Independent of node/edge order. |
| Validation | ✅ invalid graphs → HTTP 400 with `code`, `nodeIds`, `path` |
| UI calculation display | ✅ canvas overlay, results table and FY totals match the API exactly |
| **Data intake** | ❌ silent data corruption: time-zone month shift, German numbers, CSV quoting, "update" deletes months |
| **Front-end state** | ❌ stale variable cache, forecasts of the previous org after an org switch, state leaking between forecasts |
| Tenant isolation (RLS) | ✅ anon key reads nothing; the test user sees only their own orgs in every table and view |

The new engine is correct. The serious problems sit in front of it (getting data in) and around it (which result the UI shows).

## 3. Findings

Severity: **Critical** = silent wrong numbers or data loss · **High** = wrong or misleading behaviour users will hit · **Medium** = robustness / security hygiene · **Low** = UX and dev experience.

### Critical

**C1. Every upload or edit on a non-UTC backend shifts the data one month earlier, and every further save shifts it again.**
- Where: `backend/src/data-intake/data-intake.service.ts:299-315` (`normalizeToFirstOfMonth`: `new Date(str)` → `setDate(1)` / `setHours(0)` in local time → `toISOString()`).
- Evidence: the same payload `2025-01-01` was stored as `2024-12-31` by the Berlin backend and as `2025-01-01` by the UTC backend. Also wrong on the Berlin backend:
  - `2025-03-15` → `2025-02-28`
  - `2025-07-01` → `2025-06-30`
- Impact on results:
  - The TZ_impact forecast built on UI-uploaded data shows Jan 2026 = **1,155** (February's value) instead of 1,000.
  - Every month is one month early, and the last month is empty.
  - Actuals and budgets are shifted the same way.
- It accumulates: editing one value of `E2E Gappy` in the variable editor moved the whole series again (12/2025–11/2026 → 11/2025–10/2026), with no error shown. "Update existing" on import does the same.
- Why it shows up now: the old engine had the mirror-image local-time bug, which cancelled this out on CET machines. The new engine reads dates "as written", which is correct, so the intake bug is now exposed.
- Who is affected: anyone running the backend locally (Germany = UTC+1/+2) writes shifted rows into the shared Supabase project. A backend hosted in UTC does not shift new data, but the rows already in the database cannot be trusted.
- **Status: fixed on branch `fix/intake-month-shift`.**
  - Intake now reads the month with the engine's `monthIndexFromDateString`, so intake and engine agree by construction.
  - The data-intake spec covers dates as written, explicit offsets and idempotent re-saves.
  - CI runs the backend suite under UTC, Europe/Berlin and America/New_York.
  - Verified live: the Berlin-zone backend now stores `2025-01-01` as `2025-01-01`, and re-saving twice changes nothing.
  - Repair for rows already stored: `backend/sql/migrations/20261025_repair_shifted_variable_dates.sql` (draft; not yet run on the project).
- **Still open, same family (west of UTC only):**
  - The frontend parses stored dates with `new Date('YYYY-MM-DD')` (UTC) but saves them with local getters. A browser west of UTC therefore shows and re-saves every series one month early.
  - `ForecastService.generateDefaultPeriods` uses local-time `Date` methods, so on a backend west of UTC the default actual window starts a month early.

**C2. German number formats are mis-parsed silently.**
- Where: `src/app/(protected)/data-intake/_components/api-hooks.ts:540-560` runs `parseFloat` first and falls back to German parsing only when that returns `NaN`.
- Evidence: `1.235,56` → **1.235**; `13,50` → **13**.
- The README advertises German number support. Any German export with decimals or thousands separators imports wrong values without a warning.

**C3. "Update Existing" on import replaces the whole series and deletes months not in the file.**
- Evidence: `E2E Units` had 12 monthly points; importing a 3-month file with "Update Existing" left 3 points. The other 9 months were deleted.
- Users will expect "add or overwrite these months".

### High

**H1. Intake turns missing or bad values into plausible-looking data.**
- `normalizeTimeSeriesValues` (`data-intake.service.ts:362`):
  - stores `null` as **0** and numeric strings (`"42"`) as **0**;
  - stores an unparseable date (`"not-a-date"`) as the **current month**.
- This contradicts the engine spec (missing → `null`). Bad input should be rejected with HTTP 400.

**H2. The CSV parser is not a CSV parser.** It uses `split(',')` without quote handling:
- `"1,234.5"` shifts the row's values one column to the right. January is lost, and **234.5** lands in February.
- A quoted name with a comma aborts the import with `Invalid type "QUOTED""`.
- Dates are interpreted per column: `03/04/2026` → 4 March (US), `13/04/2026` → 13 April (UK), in the same file.
- The import dialog shows no parsed values, so nobody can spot any of this before saving.

**H3. The Data Intake page shows a stale browser copy, not the server.**
- The variable store skips fetching when it already holds variables for the org (`src/lib/store/variables.ts:83`, "Variables already exist in store … skipping fetch").
- After the UI upload, the page showed 15 variables dated 01/2025–12/2025. The server held 26 variables, dated 12/2024–11/2025.
- Variables created elsewhere (another user or tab, the API) never appear until localStorage is cleared. The "Update Existing" target list is incomplete for the same reason.

**H4. Switching organization shows the previous org's forecasts.**
- After switching to a new empty org, Forecast Definition and Forecast Display still listed all 14 forecasts of the previous org.
- Display kept showing the previous org's results.
- Data Intake filters correctly.
- Matches UPGRADE_PLAN Phase 1a #11 (`useOrganizationForecastsLoader`). The issue is still open on `main`.

**H5. Partial and debug runs overwrite the "latest" result.**
- `POST /calculate-unified` with `calculationTypes: []` returns 201 and stores an all-null result as the latest.
- A forecast-only run, and **any `calculate-debug` run**, are stored as the latest too.
- Forecast Display then loses its historical and budget columns, which was reproduced on A_arith.

**H6. Editor and display state leak between forecasts.**
- A brand-new, empty forecast showed the previous forecast's "Graph is valid", "Calculation Complete … 11:29:16" and value overlay.
- Opening an editor by URL and then going to Forecast Display showed "No forecasts available for this organization", although the org had 14.

**H7. Engine warnings never reach the user.**
- `VARIABLE_NOT_FOUND`, `METRIC_WITHOUT_INPUT` and similar warnings are only written to the server log.
- A deleted variable or an unconnected metric silently produces empty rows.
- Deleting a variable gives no warning that forecasts still use it.

### Medium

**M1. Client errors return HTTP 500 with raw Postgres text.**
- Cases:
  - non-UUID ids (`invalid input syntax for type uuid`);
  - `GET /forecasts` without `organizationId`;
  - bulk-save with an unknown node kind or a dangling edge;
  - data intake with an unknown id, a wrong org, an RLS violation or a duplicate id.
- These should be 400 / 403 / 404 / 409 with clean messages.

**M2. Nodes and edges are not scoped to the forecast in the route.**
- `GET /forecasts/A/nodes/<node of B>` returns 200 with B's node, and the same for edges.
- `PATCH` and `DELETE` filter by id only (`forecast-node.service.ts:136,176`, `forecast-edge.service.ts:124`).
- RLS still blocks other tenants, but within a tenant the route lies.

**M3. Windows are not validated on save.**
- An inverted actual window (`12-2025`…`01-2025`) is accepted on create and update. It fails only at calculation time (`INVALID_WINDOW`).
- An overlapping actual window is truncated silently at calculation time.

**M4. Security hygiene.**
- CORS allows `*`.
- `bulk_save_forecast_graph` is executable by `anon`: RLS stops it, but `EXECUTE` should be revoked from `PUBLIC`.
- The access token sits in a JS-readable `sb-access-token` cookie.
- `/api/health` is public and returns the backend URL. It is also prerendered as static (`○` in the build output; it calls the backend during `next build`), so in production it returns a frozen build-time snapshot instead of live status. Add `export const dynamic = 'force-dynamic'`.

**M5. Calculations load every variable from every org the user belongs to** (`getVariablesByUser`), not just the forecast's org.

**M6. Stored results grow without limit.**
- Every calculation stores the full result as JSON: about **1 MB** for the PERF graph, because the UI always requests intermediate nodes.
- History is never pruned: 36 rows after this test alone.

**M7. API contract inconsistencies.**
- `calculationTypes` comes back upper-case from POST and lower-case from GET.
- Metric order in results follows the database's arbitrary row order.
- The forecast summary returns hard-coded node and edge counts of 0.
- `GET /debug/calculation-steps` for an unknown forecast returns 200 `[]` instead of 404.

### Low (UX and dev experience)

- **L1. Import dialog.**
  - No preview of parsed values.
  - No matching on existing names: every row defaults to "Add as New", which creates duplicates.
  - The type error message omits UNKNOWN.
  - The light footer clashes with the dark theme.
- **L2. Offset direction is unlabelled.** The DATA node "Offset (months)" is a *lead* and the operator offset is a *lag*, but the UI does not say which direction either one goes.
- **L3. Operand order cannot be changed.** There is no UI to reorder operator inputs. For `−`, `/` and `^` the order is the drawing order, so changing it means deleting and redrawing edges.
- **L4. Raw UUIDs in error messages.** Cycle and validation messages show UUIDs for unnamed operators.
- **L5. Organization page.**
  - Org deletion uses a native `window.confirm`, while every other confirmation is a styled dialog.
  - The empty Organizations page has no "create your first organization" prompt.
- **L6. Inconsistent number formats.** Data Intake formats numbers as en-US, Forecast Display uses the browser locale. "2.121" means 2,121 on one page and could read as 2.121 on the other.
- **L7. Awkward new-forecast defaults.** A new forecast starts on today's date (2026-10-25, mid-month). The actual window (previous 6 months) can only be changed on the Display page, not in the editor.
- **L8. Canvas layout.** New nodes are placed overlapping, and the zoom controls are partly off-screen at about 1280×1200.
- **L9. Repeated calls.** `/users/me/claim-invites` is called 3–8 times per page load.
- **L10. One gap empties a recurrence.** A single missing input month makes the rest of a SEED recurrence `null`. That is correct per the spec, but users need to see where the chain broke.
- **L11. Dev setup.**
  - nvm-windows had no Node installed. I installed 22.23.4 but did not activate it.
  - Root Jest also collects `.claude/worktrees/*/src/**`, which adds about 50 failing suites. Add `/.claude/` to `testPathIgnorePatterns` and `modulePathIgnorePatterns`.
  - The dev bundle takes about 25 s to load from the OneDrive folder. That is an environment issue, not an app finding.

### Verified working

- **Auth:**
  - 401 without a token or with a bad token.
  - `test-auth` gated; `/api/env-test` 404; `/debug-calc` 404 without the flag.
  - The `redirect_count` middleware bypass is gone.
- **RLS:** the anon key reads `[]` from every table; the test user sees only their own orgs and members, including `organization_members_with_emails`.
- **Engine and validation:** every scenario in §1 matches. Validation returns 400 with codes, and cycles carry a `path`. Division by zero → `null`.
- **UI:**
  - **Organizations:** create (with empty-name validation), rename and delete.
  - **CSV upload:** comma delimiter, CRLF, `MM/yyyy`, lower-case type, negatives, scientific notation; clear errors for empty, header-only, wrong-extension and bad-header files.
  - **Variables:** delete, with confirmation.
  - **Canvas:** add, connect (rank badges), configure, save and calculate.
    - Connect-time cycle rejection.
    - Client-side cycle highlight before calculating.
    - A "2,5" constant parses as 2.5.
    - Unsaved changes survive navigation; Reload asks for confirmation.
  - **Display:** monthly values and FY totals exact.
- **Performance:** the 142-node, 72-month calculation takes 0.7–1.4 s end to end; bulk-save takes 0.7 s.

### Not tested

- Viewer and editor role restrictions (needs a second account).
- Member invites (sends real email).
- Excel export (file download).
- The Playwright suite (it signs in with the password).
- A deployed environment (the production build was only compiled, not served).

Token refresh was checked later and works: the session renewed on its own when the first token expired.

## 4. Improvement plan

Ordered by risk. Where an item overlaps [UPGRADE_PLAN.md](UPGRADE_PLAN.md), the phase is noted.

### Phase A: stop data corruption (do first, ~2 days)

1. **Fix intake dates (C1).** ✅ Done on `fix/intake-month-shift`: calendar-field parsing, multi-time-zone tests, CI steps. Still to do: the two west-of-UTC follow-ups listed under C1.
2. **Repair existing rows.** Drafted: `backend/sql/migrations/20261025_repair_shifted_variable_dates.sql`.
   - Step 1 previews the affected variables. Step 2 backs them up into the non-exposed `repair` schema, moves last-day-of-month dates to the first of the next month, runs three checks and ends with ROLLBACK.
   - Variables that may have drifted more than one month are flagged for review rather than guessed at.
   - Tested against fixtures on an in-memory Postgres (PGlite): dry run, commit, re-run and undo.
   - Run it only after the fix is deployed, then recalculate the affected forecasts.
3. **Keep missing values (H1).** Reject points with an unparseable date or value (400). Keep `null` as `null`.
4. **Replace the CSV parsing (C2, H2).**
   - Use a real parser such as papaparse.
   - Parse numbers strictly: the whole cell must match.
   - Use one decimal convention per file, auto-detected with an override in the import dialog.
   - Use one date format per file and warn when dates are ambiguous.
   - Show a preview grid of the parsed values before importing.
5. **Make "Update Existing" merge by month (C3).** Keep an explicit "replace whole series" option.

### Phase B: show the right numbers (~3 days) · UPGRADE_PLAN Phase 5 items 3–4

6. **Protect the latest result (H5).**
   - Require at least one calculation type (`ArrayNotEmpty`).
   - Don't persist debug runs, or tag them and exclude them from "latest".
   - "Latest" means the latest full run.
7. **Surface warnings (H7).** Return engine `warnings` in the calculation response and show them in the toolbar and on the Display page. Warn before deleting a variable that a forecast references.
8. **Key server state by org (H3, H4, H6).**
   - Refetch on mount and on org switch (TanStack Query, as already planned).
   - Reset the editor store whenever the `forecastId` changes.
   - Load the forecast list on the Display page whenever it is empty.

### Phase C: API hardening (~2 days) · UPGRADE_PLAN Phase 4 items 3–7

9. **Errors (M1).**
   - `ParseUUIDPipe` on every id.
   - A global exception filter that maps PostgREST errors (`22P02` → 400, `23505` → 409, `42501` → 403, `PGRST116` → 404) to clean messages.
   - Enum validation of `kind` in bulk-save.
10. **Scope and validate (M2, M3).**
    - Scope node and edge reads and writes by `forecast_id`.
    - Validate the actual and forecast windows when a forecast is saved.
11. **Hygiene (M4, M5).**
    - CORS allow-list.
    - Revoke `EXECUTE` on the RPC from `PUBLIC`/`anon`.
    - HttpOnly cookies.
    - Load only the forecast org's variables.

### Phase D: keep it fixed (~2 days)

12. **Automate this report as tests.** Turn the scenarios into automated tests: synthetic fixtures plus expected values, run as API contract tests and a small Playwright flow against a local `supabase start` stack in CI. Run under a time-zone matrix.
13. **Unit-test the CSV parser.** Cover German numbers, quoting, ambiguous dates and CRLF.
14. **Ignore stray worktrees.** Add `/.claude/` to the Jest ignore patterns.

### Phase E: UX polish (ongoing) · UPGRADE_PLAN Phase 6

15. **Import and canvas (L1–L4).**
    - Import dialog: preview and name matching.
    - Offset direction labels.
    - Drag-to-reorder operands.
    - Node names instead of UUIDs in messages.
16. **Defaults, formats and storage (L5–L10, M6, M7).**
    - Consistent number formatting.
    - Default forecast start on the first of next month, with an actual-window control in the editor.
    - Result retention, for example the last N runs.
    - Real summary counts.
    - De-duplicated `claim-invites` calls.

## 5. Test data left behind

- **Organization "E2E Test 2026-10-24":**
  - 25 variables: E2E-* uploaded via UI (date-shifted by C1), UTC-* clean set, edge cases.
  - 15 forecasts: E2E A_arith … PERF, TZ_impact, V_invalid, "New Forecast".
  - About 40 calculation results.
- "E2E Test Org B" was created, renamed and deleted during the test.
- Deleting the organization removes all of it (ON DELETE CASCADE).
