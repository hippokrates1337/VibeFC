import { parse, format as formatDateFn } from 'date-fns'
import { type Variable } from '@/lib/store/variables'

/**
 * Parses a date string in various formats
 */
export function parseDate(dateStr: string): Date | null {
  const formats = [
    'yyyy-MM-dd',    // ISO format
    'dd.MM.yyyy',    // German format
    'MM/dd/yyyy',    // US format
    'dd/MM/yyyy',    // UK format
    'yyyy.MM.dd',    // Alternative ISO format
    'MM.yyyy',       // Short German format
    'MM/yyyy',       // Short US/UK format
    'yyyy-MM',       // Short ISO format
  ]

  for (const format of formats) {
    try {
      const date = parse(dateStr.trim(), format, new Date())
      if (!isNaN(date.getTime())) {
        return date
      }
    } catch {
      continue
    }
  }
  return null
}

/**
 * Formats a date object to MM-yyyy format
 */
export function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    console.error('Invalid date object:', date)
    return 'Invalid Date'
  }
  return formatDateFn(date, 'MM-yyyy')
}

/**
 * Formats a number value using German locale
 */
export function formatNumber(value: number | null): string {
  if (value === null) return ''
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
}

/**
 * Validates if a string is a valid variable type
 */
export function isValidVariableType(type: string): type is Variable['type'] {
  return ['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN'].includes(type.toUpperCase() as Variable['type'])
}

/**
 * Validates CSV headers
 */
export function validateHeaders(headers: string[], onError: (message: string) => void): boolean {
  if (headers.length < 3) return false // At least variable, type, and one date
  if (headers[0].toLowerCase() !== 'variable') return false
  if (headers[1].toLowerCase() !== 'type') return false

  // Check if all columns after the second one contain valid dates
  for (let i = 2; i < headers.length; i++) {
    const date = parseDate(headers[i])
    if (!date) {
      onError(`Invalid date format in column ${i + 1}. Expected yyyy-MM-dd or dd.MM.yyyy`)
      return false
    }
  }
  return true
} 