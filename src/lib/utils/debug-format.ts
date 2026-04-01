/**
 * Consistent locale-aware number formatting for debug UIs (step log, exports).
 */
export function formatDebugNumber(value: number | null): string {
  if (value === null) {
    return 'null';
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0
  });
}
