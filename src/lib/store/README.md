# Client state

Server data and editor state live in different places:

| What | Where | Kept in browser storage |
|---|---|---|
| Forecast list of an organization | `useOrganizationForecasts(orgId)` in `src/lib/queries/forecasts.ts` (TanStack Query, key `['forecasts', 'list', orgId]`) | no |
| Variables | `useVariables(orgId?)` in `src/lib/queries/variables.ts` (one load for all of the user's organizations, filtered per organization) | no |
| Organizations, current organization, role, members | `useOrganizationStore` in `organization.ts` (Zustand) | only the current organization's id (`organization-storage`) |
| The forecast being edited: graph, periods, calculation results, validation, editor UI, debug data | `useForecastGraphStore` in `forecast-graph-store/` (Zustand) | no |

Signing out clears the query cache and the stores. Earlier versions cached variables and the
forecast graph in `localStorage` (`variable-storage`, `forecast-graph-store`); `QueryProvider`
removes those keys on start.

## Server data (TanStack Query)

`QueryProvider` (`src/providers/query-provider.tsx`) wraps the app outside `AuthProvider`.

- Lists are cached per organization, so an organization switch shows that organization's list
  and never the previous one. Pages refetch on mount.
- After a change, update or invalidate the query instead of keeping a copy:
  `useReloadVariables()` after saving variables, `queryClient.setQueryData(forecastKeys.list(orgId), …)`
  after deleting a forecast, `invalidateQueries({ queryKey: forecastKeys.list(orgId) })` after creating one.
- Requests take the access token from `getAccessToken()` (`src/lib/auth/access-token.ts`), which
  lets supabase-js refresh an expired token first.

## `variables.ts`

Only types and the API mapping: `Variable`, `TimeSeriesData` (`month` is `'YYYY-MM'`, `value` may
be `null`) and `toStoreVariable` (API `values: [{date: 'YYYY-MM-01', value}]` → `timeSeries`).

## `forecast-graph-store/`

One Zustand store split into slices (`state/`) and actions (`actions/`), read through the hooks in
`hooks/` (`useForecastGraph`, `useCalculations`, `useVisualization`, `useDebug`, …).

- `loadForecast` replaces the graph. Opening a **different** forecast also resets what belonged to
  the previous one (results, validation, selected node, slider, debug data); reloading the same
  forecast (e.g. after saving) keeps it.
- The editor page loads the latest stored result after opening a forecast
  (`loadUnifiedCalculationResults`); results that arrive after another forecast was opened are dropped.
- Nothing is persisted. The editor asks before the tab is closed with unsaved edits, and Forecast
  Display asks before loading another forecast over unsaved edits.

## `organization.ts`

Loads the user's organizations from Supabase (`fetchOrganizationData`), keeps the current
organization and the user's role in it, and loads members. `switchOrganization` changes the
current organization; pages read their lists for it from the queries above.
