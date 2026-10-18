# Forecast graph validation (frontend)

`graph-validation.ts` adapts the canvas nodes and edges to `@vibefc/forecast-engine` and
runs the same validation the backend calculation uses, so the editor and the server never
disagree. Rules and issue codes: `docs/forecast-engine.md` §3.

- `validateForecastGraph(nodes, edges)` returns `{isValid, errors, warnings}` (messages, for
  the existing UI) plus `issues` (`{code, nodeIds, path}`) for highlighting nodes and cycles.
- `checkForecastConnection(nodes, edges, {source, target})` returns the errors a new edge would
  introduce; meant for React Flow's `isValidConnection` (not wired up yet).

Calculations run in the backend (`POST /forecasts/:id/calculate-unified`).
