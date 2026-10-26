/**
 * Reads a variables CSV: one row per variable, columns `Variable`, `Type`, then one column
 * per month. Pure functions, no Date objects: months are 'YYYY-MM' strings read as written,
 * so the browser's time zone never matters.
 *
 * Each file uses one number format and one date order. Both are detected from the whole
 * file; when the file does not decide them, the result says so (`ambiguous`) and the caller
 * can pass an explicit choice. Cells that don't fit the chosen format are reported as
 * errors instead of being guessed, dropped or truncated.
 */
import type { Variable } from '@/lib/store/variables'

export type DecimalSeparator = 'dot' | 'comma'
export type DateOrder = 'DMY' | 'MDY'
export type Delimiter = ',' | ';' | '\t'

export interface CsvImportOptions {
  decimal?: DecimalSeparator
  dateOrder?: DateOrder
}

export interface ParsedPoint {
  month: string // 'YYYY-MM'
  value: number
}

export interface ParsedVariable {
  name: string
  type: Variable['type']
  points: ParsedPoint[]
}

export interface CsvIssue {
  row: number // 1-based record number; the header is row 1
  column?: string // header text of the cell's column
  message: string
}

export interface CsvImportResult {
  variables: ParsedVariable[]
  /** Month of each date column, in file order. */
  months: string[]
  delimiter: Delimiter
  decimal: { value: DecimalSeparator; ambiguous: boolean }
  /** `relevant` is false when no header uses day/month/year with slashes. */
  dateOrder: { value: DateOrder; relevant: boolean; ambiguous: boolean }
  /** Any error blocks the import. */
  errors: CsvIssue[]
  warnings: CsvIssue[]
}

const VARIABLE_TYPES: ReadonlyArray<Variable['type']> = ['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN']
const NAME_HEADERS = ['variable', 'name', 'variable name']
const TYPE_HEADERS = ['type', 'variable type']

// ---------------------------------------------------------------------------------------
// CSV records (RFC 4180: quoted cells may contain the delimiter, quotes ("") and newlines)
// ---------------------------------------------------------------------------------------

export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { ',': 0, ';': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break
    else if (!inQuotes && ch in counts) counts[ch as Delimiter]++
  }
  return (Object.keys(counts) as Delimiter[]).reduce((best, d) => (counts[d] > counts[best] ? d : best), ',')
}

export function parseCsvRecords(text: string, delimiter: Delimiter): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let cell = ''
  let inQuotes = false
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (inQuotes) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      record.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++
      record.push(cell)
      records.push(record)
      record = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || record.length > 0) {
    record.push(cell)
    records.push(record)
  }
  return records
}

// ---------------------------------------------------------------------------------------
// Header months
// ---------------------------------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, januar: 1, jän: 1, jänner: 1,
  feb: 2, february: 2, februar: 2,
  mar: 3, march: 3, mär: 3, märz: 3, maerz: 3,
  apr: 4, april: 4,
  may: 5, mai: 5,
  jun: 6, june: 6, juni: 6,
  jul: 7, july: 7, juli: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, december: 12, dez: 12, dezember: 12,
}

type HeaderDate =
  | { kind: 'month'; month: string }
  // day/month/year with slashes: the order decides the month
  | { kind: 'slash'; a: number; b: number; year: number }

const pad = (n: number): string => String(n).padStart(2, '0')
const toYear = (y: string): number => (y.length === 2 ? 2000 + Number(y) : Number(y))
const daysInMonth = (year: number, month: number): number => [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]

function monthOf(year: number, month: number, day?: number): string | null {
  if (month < 1 || month > 12 || year < 1000 || year > 9999) return null
  if (day !== undefined && (day < 1 || day > daysInMonth(year, month))) return null
  return `${year}-${pad(month)}`
}

/** Header text -> month, a slash date whose order is still open, or null (not a date). */
export function parseHeaderDate(header: string): HeaderDate | null {
  const h = header.trim()
  let m: RegExpExecArray | null

  // 2026-01-31, 2026-01, 2026/01/31, 2026.01.31
  if ((m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(h)) || (m = /^(\d{4})[./](\d{1,2})[./](\d{1,2})$/.exec(h))) {
    const month = monthOf(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : undefined)
    return month ? { kind: 'month', month } : null
  }
  // 31.01.2026 (German order is unambiguous)
  if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(h))) {
    const month = monthOf(toYear(m[3]), Number(m[2]), Number(m[1]))
    return month ? { kind: 'month', month } : null
  }
  // 01.2026, 01/2026, 01-2026
  if ((m = /^(\d{1,2})[./-](\d{4})$/.exec(h))) {
    const month = monthOf(Number(m[2]), Number(m[1]))
    return month ? { kind: 'month', month } : null
  }
  // 03/04/2026: day/month or month/day
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(h))) {
    return { kind: 'slash', a: Number(m[1]), b: Number(m[2]), year: Number(m[3]) }
  }
  // Jan 2026, Januar 2026, Mar-26, März 26
  if ((m = /^([A-Za-zÄÖÜäöü]{3,9})\.?[\s\-_']*(\d{2}|\d{4})$/.exec(h))) {
    const monthNumber = MONTH_NAMES[m[1].toLowerCase()]
    const month = monthNumber ? monthOf(toYear(m[2]), monthNumber) : null
    return month ? { kind: 'month', month } : null
  }
  return null
}

function resolveSlash(date: Extract<HeaderDate, { kind: 'slash' }>, order: DateOrder): string | null {
  const [day, month] = order === 'DMY' ? [date.a, date.b] : [date.b, date.a]
  return monthOf(date.year, month, day)
}

// ---------------------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------------------

// 1234 | 1,234 | 1,234.5 | 1234.5 | 1.5e3
const DOT_NUMBER = /^[+-]?(\d+|\d{1,3}(,\d{3})+)(\.\d+)?([eE][+-]?\d+)?$/
// 1234 | 1.234 | 1.234,5 | 1234,5
const COMMA_NUMBER = /^[+-]?(\d+|\d{1,3}(\.\d{3})+)(,\d+)?$/

function cleanNumberCell(raw: string): { text: string; negate: boolean } {
  let text = raw.trim().replace(/[\s  ]/g, '')
  let negate = false
  const accounting = /^\((.+)\)$/.exec(text) // (1,234.00) = -1234
  if (accounting) {
    text = accounting[1]
    negate = true
  }
  return { text, negate }
}

export function parseNumberCell(raw: string, decimal: DecimalSeparator): number | null {
  const { text, negate } = cleanNumberCell(raw)
  let normalized: string
  if (decimal === 'dot') {
    if (!DOT_NUMBER.test(text)) return null
    normalized = text.replace(/,/g, '')
  } else {
    if (!COMMA_NUMBER.test(text)) return null
    normalized = text.replace(/\./g, '').replace(',', '.')
  }
  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return negate ? -value : value
}

/** Which convention the cell proves, if any. '1.234' and '1,234' prove nothing. */
function numberEvidence(raw: string): DecimalSeparator | 'both' | 'neither' {
  const { text } = cleanNumberCell(raw)
  const dot = DOT_NUMBER.test(text)
  const comma = COMMA_NUMBER.test(text)
  if (dot && comma) return 'both'
  if (dot) return 'dot'
  if (comma) return 'comma'
  return 'neither'
}

// ---------------------------------------------------------------------------------------
// File
// ---------------------------------------------------------------------------------------

export function parseVariablesCsv(text: string, options: CsvImportOptions = {}): CsvImportResult {
  const delimiter = detectDelimiter(text)
  const errors: CsvIssue[] = []
  const warnings: CsvIssue[] = []
  const records = parseCsvRecords(text, delimiter).filter((record) => record.some((cell) => cell.trim() !== ''))

  const empty = (decimal: DecimalSeparator, dateOrder: DateOrder): CsvImportResult => ({
    variables: [],
    months: [],
    delimiter,
    decimal: { value: decimal, ambiguous: false },
    dateOrder: { value: dateOrder, relevant: false, ambiguous: false },
    errors,
    warnings,
  })

  if (records.length === 0) {
    errors.push({ row: 1, message: 'The file is empty.' })
    return empty(options.decimal ?? 'dot', options.dateOrder ?? 'DMY')
  }

  // Header: name and type columns, then month columns
  const header = records[0].map((h) => h.trim())
  const nameIndex = header.findIndex((h) => NAME_HEADERS.includes(h.toLowerCase()))
  const typeIndex = header.findIndex((h) => TYPE_HEADERS.includes(h.toLowerCase()))
  if (nameIndex === -1 || typeIndex === -1) {
    errors.push({ row: 1, message: 'The first row needs a "Variable" column and a "Type" column.' })
    return empty(options.decimal ?? 'dot', options.dateOrder ?? 'DMY')
  }

  const dateColumns: Array<{ index: number; header: string; date: HeaderDate }> = []
  header.forEach((h, index) => {
    if (index === nameIndex || index === typeIndex || h === '') return
    const date = parseHeaderDate(h)
    if (date) dateColumns.push({ index, header: h, date })
    else warnings.push({ row: 1, column: h, message: `Column "${h}" is not a month and is ignored.` })
  })
  if (dateColumns.length === 0) {
    errors.push({ row: 1, message: 'No month columns found. Use headers like 2026-01, 01.2026, 01/2026 or Jan 2026.' })
    return empty(options.decimal ?? 'dot', options.dateOrder ?? 'DMY')
  }

  // Date order: decided by any slash date with a part above 12, otherwise open
  const slashDates = dateColumns.filter((c) => c.date.kind === 'slash').map((c) => c.date as Extract<HeaderDate, { kind: 'slash' }>)
  const needsDMY = slashDates.some((d) => d.a > 12)
  const needsMDY = slashDates.some((d) => d.b > 12)
  if (needsDMY && needsMDY) {
    errors.push({ row: 1, message: 'The month columns mix day/month/year and month/day/year dates.' })
  }
  const detectedOrder: DateOrder | null = needsDMY && !needsMDY ? 'DMY' : needsMDY && !needsDMY ? 'MDY' : null
  const dateOrderValue: DateOrder = options.dateOrder ?? detectedOrder ?? 'DMY'

  const months: string[] = []
  const columnMonth = new Map<number, string>()
  for (const column of dateColumns) {
    const month = column.date.kind === 'month' ? column.date.month : resolveSlash(column.date, dateOrderValue)
    if (!month) {
      errors.push({ row: 1, column: column.header, message: `"${column.header}" is not a valid date as ${dateOrderValue === 'DMY' ? 'day/month/year' : 'month/day/year'}.` })
      continue
    }
    if (months.includes(month)) {
      const [y, m] = month.split('-')
      errors.push({ row: 1, column: column.header, message: `Two columns fall into ${m}/${y}; each month may appear once.` })
      continue
    }
    months.push(month)
    columnMonth.set(column.index, month)
  }

  // Number format: decided by cells only one convention can read
  const valueCells = records.slice(1).flatMap((record) => dateColumns.map((c) => (record[c.index] ?? '').trim()).filter((cell) => cell !== ''))
  const evidence = new Set(valueCells.map(numberEvidence))
  const dotProof = evidence.has('dot')
  const commaProof = evidence.has('comma')
  const preferred: DecimalSeparator = delimiter === ';' ? 'comma' : 'dot'
  const detectedDecimal: DecimalSeparator | null = dotProof && !commaProof ? 'dot' : commaProof && !dotProof ? 'comma' : null
  const decimalValue: DecimalSeparator = options.decimal ?? detectedDecimal ?? preferred
  // Open when the file proves both, or contains cells like '1.234' that read differently
  const decimalAmbiguous =
    detectedDecimal === null && (dotProof || commaProof || valueCells.some((cell) => /^[+-]?\d{1,3}([.,]\d{3})+$/.test(cleanNumberCell(cell).text)))

  // Rows
  const variables: ParsedVariable[] = []
  const seenNames = new Map<string, number>()
  records.slice(1).forEach((record, i) => {
    const row = i + 2
    const name = (record[nameIndex] ?? '').trim()
    const typeText = (record[typeIndex] ?? '').trim().toUpperCase()
    if (!name) {
      errors.push({ row, message: 'The variable name is empty.' })
      return
    }
    const firstRow = seenNames.get(name.toLowerCase())
    if (firstRow !== undefined) {
      errors.push({ row, message: `"${name}" already appears in row ${firstRow}.` })
      return
    }
    seenNames.set(name.toLowerCase(), row)
    if (!VARIABLE_TYPES.includes(typeText as Variable['type'])) {
      errors.push({ row, column: header[typeIndex], message: `Type "${record[typeIndex] ?? ''}" of "${name}" must be ACTUAL, BUDGET, INPUT or UNKNOWN.` })
      return
    }

    const points: ParsedPoint[] = []
    for (const column of dateColumns) {
      const month = columnMonth.get(column.index)
      const raw = (record[column.index] ?? '').trim()
      if (!month || raw === '') continue // empty cell: no value for that month
      const value = parseNumberCell(raw, decimalValue)
      if (value === null) {
        errors.push({ row, column: column.header, message: `"${raw}" in "${name}" is not a number in the ${decimalValue === 'dot' ? '1,234.56' : '1.234,56'} format.` })
        continue
      }
      points.push({ month, value })
    }
    points.sort((a, b) => (a.month < b.month ? -1 : 1))
    variables.push({ name, type: typeText as Variable['type'], points })
  })

  if (variables.length === 0 && errors.length === 0) {
    errors.push({ row: 2, message: 'The file has a header but no variables.' })
  }

  return {
    variables,
    months,
    delimiter,
    decimal: { value: decimalValue, ambiguous: options.decimal === undefined && decimalAmbiguous },
    dateOrder: {
      value: dateOrderValue,
      relevant: slashDates.length > 0,
      ambiguous: options.dateOrder === undefined && slashDates.length > 0 && detectedOrder === null,
    },
    errors,
    warnings,
  }
}
