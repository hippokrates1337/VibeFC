/**
 * Unified number formatting for forecast result tables (German locale: `de-DE`).
 *
 * ## Rules
 *
 * 1. **Null / NaN** → `'-'`
 * 2. **Zero** → plain `0` (not `0 %`).
 * 3. **Ratios (0 &lt; |v| ≤ 1)** → **percent** (`Intl`, e.g. `0,2` → `20 %`, `1` → `100 %`).
 *    Typical for conversion rates stored as fractions. If a metric is not a rate but
 *    happens to fall in this range, consider scaling or a future per-node display hint.
 * 4. **Large amounts (|v| ≥ 1 000 000)** → **compact** (`Mio.`, …) so ARR and similar
 *    stay short (e.g. `12 Mio.`).
 * 5. **Pipeline-scale amounts (1 000 ≤ |v| &lt; 1 000 000)** → **grouped decimal**
 *    (no `Mio.`/`Tsd.` suffix), e.g. `150.000`, `360.926,4` — same style as typical
 *    operator/data outputs in this band.
 * 6. **Smaller (|v| &gt; 1 and |v| &lt; 1 000)** → grouped decimal, up to 2 fraction digits.
 *
 * All branches use the same locale so metric, operator, data, and seed cells align.
 */

const LOCALE = 'de-DE';

export function formatForecastTableNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }

  if (Object.is(value, -0) || value === 0) {
    return new Intl.NumberFormat(LOCALE, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(0);
  }

  const abs = Math.abs(value);

  // Fractions in (0, 1] → percent (conversion rates, etc.)
  if (abs <= 1) {
    return new Intl.NumberFormat(LOCALE, {
      style: 'percent',
      maximumFractionDigits: abs < 0.01 ? 4 : 2,
      minimumFractionDigits: 0,
    }).format(value);
  }

  if (abs >= 1_000_000) {
    return new Intl.NumberFormat(LOCALE, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}
