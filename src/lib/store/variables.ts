/**
 * Variable types. The variables themselves are server data, loaded with TanStack Query
 * (see `@/lib/queries/variables`); nothing is kept in a store or in browser storage.
 */

/** One month of a variable. `month` is 'YYYY-MM' (no Date: months must not depend on the time zone). */
export interface TimeSeriesData {
  month: string
  value: number | null
}

export interface Variable {
  id: string
  name: string
  type: 'ACTUAL' | 'BUDGET' | 'INPUT' | 'UNKNOWN'
  timeSeries: TimeSeriesData[]
  organizationId: string
}

/** API variable row (`values: [{date: 'YYYY-MM-01', value}]`) -> client variable. */
export const toStoreVariable = (v: any): Variable => ({
  id: v.id,
  name: v.name,
  type: v.type as Variable['type'],
  organizationId: v.organization_id,
  timeSeries: (Array.isArray(v.values) ? v.values : []).map((point: any) => ({
    month: String(point.date).slice(0, 7),
    value: point.value === null || point.value === undefined ? null : Number(point.value),
  })),
})
