# Forecast module

Forecast CRUD (forecasts, nodes, edges) and calculation.

The calculation engine lives in `packages/forecast-engine`; its semantics (node types,
lag edges, SEED, windows, missing data, validation codes) are specified in
`docs/forecast-engine.md`.

- `services/forecast-engine.service.ts`: thin Nest wrapper around the engine. Converts
  database rows to the engine's input and the result back to MM-YYYY rows; an invalid
  graph becomes HTTP 400 with `{errors: [{code, message, nodeIds, path}]}`.
- `services/forecast-calculation.service.ts`: loads a forecast's periods, graph and
  variables, runs the engine and stores the result in `forecast_calculation_results`.
- `services/debug-calculation.service.ts`: the same calculation with the engine's trace,
  mapped to the debug DTOs.

Endpoints (`controllers/forecast-calculation.controller.ts`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/forecasts/:id/calculate-unified` | calculate and store |
| GET | `/forecasts/:id/calculation-results-unified` | latest stored result |
| GET | `/forecasts/:id/calculation-results/history` | all stored results |
| POST | `/forecasts/:id/calculate-debug` | calculate with trace |
| GET | `/forecasts/:id/debug/calculation-tree` | graph as one tree per metric |
| GET | `/forecasts/:id/debug/calculation-steps` | steps of the caller's last debug run |

## Access and checks

- Every route loads the forecast first: 404 unless the caller's organization owns it.
  Node and edge routes then only find nodes and edges **of that forecast**
  (`/forecasts/:forecastId/nodes/:nodeId` with a node of another forecast is a 404), and
  an edge can only connect two nodes of its own forecast. Path ids must be UUIDs (400).
- Members read; only editors and admins write forecasts, nodes, edges and results
  (row-level security, `supabase/migrations/20261101120000_viewers_read_only.sql`). A
  refused write is a 403.
- Periods (`services/forecast-periods.ts`): dates are `YYYY-MM-DD`, the end not before the
  start; months are `MM-YYYY` and both windows run forwards. Checked on create, update,
  `PATCH :id/periods` and bulk save (400 naming every problem). The actual window may
  overlap the forecast window; the calculation ends it before the forecast starts.
  Forecast months always follow the dates.
