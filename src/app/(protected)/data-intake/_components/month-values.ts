import type { TimeSeriesData } from '@/lib/store/variables'
import { parseNumberCell, type DecimalSeparator } from './csv-import'

/** 'YYYY-MM' -> 'MM/YYYY' */
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-')
  return `${m}/${year}`
}

export function sortByMonth(points: TimeSeriesData[]): TimeSeriesData[] {
  return [...points].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
}

/** 'MM/YYYY – MM/YYYY' for the first and last month ('MM/YYYY' for one month), or null without points. */
export function monthRangeLabel(points: Array<{ month: string }>): string | null {
  if (points.length === 0) return null
  const months = points.map((p) => p.month).sort()
  const first = formatMonthLabel(months[0])
  const last = formatMonthLabel(months[months.length - 1])
  return first === last ? first : `${first} – ${last}`
}

/** API payload point for a store point. */
export function toApiPoint(point: { month: string; value: number | null }): { date: string; value: number | null } {
  return { date: `${point.month}-01`, value: point.value }
}

function preferredDecimal(): DecimalSeparator {
  if (typeof navigator === 'undefined') return 'dot'
  return (1.5).toLocaleString(navigator.language).includes(',') ? 'comma' : 'dot'
}

/**
 * A number typed by the user. The browser locale decides '1.234' (1234 in German, 1.234 in
 * English); input only the other convention can read ('12.5' in German) is accepted too.
 * Empty input is null (no value); anything else unreadable is undefined.
 */
export function parseUserNumber(text: string): number | null | undefined {
  if (text.trim() === '') return null
  const preferred = preferredDecimal()
  const other: DecimalSeparator = preferred === 'dot' ? 'comma' : 'dot'
  return parseNumberCell(text, preferred) ?? parseNumberCell(text, other) ?? undefined
}

export function formatValue(value: number | null): string {
  return value === null ? '–' : value.toLocaleString(undefined, { maximumFractionDigits: 10 })
}
