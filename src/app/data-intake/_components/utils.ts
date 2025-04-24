import { parse, format as formatDateFn } from 'date-fns'
import { type Variable } from '@/lib/store/variables'

/**
 * Parses a date string in various formats
 * @param dateStr The date string to parse
 * @returns A Date object if successful, null if parsing fails
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null
  }

  const trimmedDate = dateStr.trim()
  if (!trimmedDate) {
    return null
  }

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
      const date = parse(trimmedDate, format, new Date())
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
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    console.error('Invalid date object:', date)
    return 'Invalid Date'
  }
  return formatDateFn(date, 'MM-yyyy')
}

/**
 * Formats a number value using international notation (. as decimal separator, , as thousand separator)
 * @param value The number to format
 * @param decimalPlaces Number of decimal places to display (default: 1)
 * @returns Formatted number string
 */
export function formatNumber(value: number | null | undefined, decimalPlaces: number = 1): string {
  // Handle undefined values the same as null
  if (value === undefined) {
    return ''; 
  }
  
  if (value === null) {
    return '';
  }
  
  if (typeof value !== 'number') {
    // Try to convert strings or other types to number
    const converted = Number(value);
    if (!isNaN(converted)) {
      value = converted;
    } else {
      return String(value); // Return as-is if conversion fails
    }
  }
  
  if (isNaN(value)) {
    return 'NaN';
  }
  
  try {
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
    return formatted;
  } catch (error) {
    console.error('Error formatting number:', error);
    return value.toString();
  }
}

/**
 * Validates if a string is a valid variable type
 * @param type The type string to validate
 * @returns True if the type is valid, false otherwise
 */
export function isValidVariableType(type: string): type is Variable['type'] {
  if (!type) return false
  return ['ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN'].includes(type.toUpperCase() as Variable['type'])
}

/**
 * Validates CSV headers
 * @param headers Array of header strings to validate
 * @param onError Callback for error messages
 * @returns True if headers are valid, false otherwise
 */
export function validateHeaders(headers: string[], onError: (message: string) => void): boolean {
  if (!headers || !Array.isArray(headers)) {
    onError('Invalid headers: must be an array')
    return false
  }
  
  if (headers.length < 3) {
    onError('CSV must contain at least 3 columns: Variable, Type, and at least one date')
    return false
  }
  
  if (headers[0].toLowerCase() !== 'variable') {
    onError('First column must be "Variable"')
    return false
  }
  
  if (headers[1].toLowerCase() !== 'type') {
    onError('Second column must be "Type"')
    return false
  }

  // Check if all columns after the second one contain valid dates
  let validDateColumns = 0
  for (let i = 2; i < headers.length; i++) {
    const date = parseDate(headers[i])
    if (!date) {
      onError(`Invalid date format in column ${i + 1}. Expected formats: yyyy-MM-dd, dd.MM.yyyy, etc.`)
      return false
    }
    validDateColumns++
  }
  
  if (validDateColumns === 0) {
    onError('CSV must contain at least one date column after Variable and Type')
    return false
  }
  
  return true
} 