// Generates synthetic CSVs for VibeFC E2E testing with known, month-distinct values.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
mkdirSync(out, { recursive: true });

const months = [];
for (const y of [2025, 2026]) for (let m = 1; m <= 12; m++) months.push({ y, m, i: months.length });
const iso = ({ y, m }) => `${y}-${String(m).padStart(2, '0')}-01`;

// name, type, fn({y,m,i}) -> number | null
export const VARS = [
  ['E2E Revenue Actual', 'ACTUAL', ({ y, m }) => (y === 2025 ? 1000 + 100 * (m - 1) : null)],
  ['E2E Revenue Budget', 'BUDGET', ({ y, m }) => (y === 2025 ? 900 + 100 * (m - 1) : 2000 + 150 * (m - 1))],
  ['E2E Units', 'INPUT', ({ y, m }) => (y === 2026 ? 100 + 10 * (m - 1) : null)],
  ['E2E Price', 'INPUT', ({ y, m }) => (y === 2026 ? 10 + 0.5 * (m - 1) : null)],
  ['E2E Growth', 'INPUT', ({ y, m }) => (y === 2026 ? +(0.01 * m).toFixed(2) : null)],
  ['E2E Gappy', 'INPUT', ({ y, m }) => (y === 2026 && m !== 6 ? 7 * m : null)],
  ['E2E Cost Actual', 'ACTUAL', ({ y, m }) => (y === 2025 ? 400 + 20 * (m - 1) : null)],
  ['E2E Cost Budget', 'BUDGET', ({ i }) => 450 + 10 * i],
  ['E2E Headcount', 'UNKNOWN', ({ i }) => 10 + i],
];

const header = ['Variable', 'Type', ...months.map(iso)].join(',');
const rows = VARS.map(([name, type, fn]) => [name, type, ...months.map((mo) => { const v = fn(mo); return v === null ? '' : String(v); })].join(','));
writeFileSync(join(out, 'e2e-main.csv'), [header, ...rows].join('\n') + '\n');

// German format: semicolon delimiter, dd.MM.yyyy headers, decimal comma, thousands dot
const de = months.filter((mo) => mo.y === 2026);
const deHeader = ['Variable', 'Type', ...de.map(({ y, m }) => `01.${String(m).padStart(2, '0')}.${y}`)].join(';');
const deFmt = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const deRows = [
  ['E2E DE Price', 'INPUT', de.map(({ m }) => 1234.56 + m)], // e.g. "1.235,56"
  ['E2E DE Small', 'INPUT', de.map(({ m }) => 12.5 + m)],     // e.g. "13,50"
].map(([n, t, vals]) => [n, t, ...vals.map(deFmt)].join(';'));
writeFileSync(join(out, 'e2e-german.csv'), [deHeader, ...deRows].join('\n') + '\n');

// Edge cases: CRLF, MM/yyyy headers, lowercase type, negative, scientific, quoted name w/ comma, duplicate name
const ed = months.filter((mo) => mo.y === 2026 && mo.m <= 3);
const edHeader = ['Variable', 'Type', ...ed.map(({ y, m }) => `${String(m).padStart(2, '0')}/${y}`)].join(',');
const edRows = [
  'E2E Edge Negative,input,-100,-200.5,-300',
  'E2E Edge Sci,INPUT,1e3,2.5e2,3E1',
  '"E2E Edge, Quoted",INPUT,1,2,3',
  'E2E Units,INPUT,999,999,999',
  'E2E Edge Thousands,INPUT,"1,234.5",2000,3000',
];
writeFileSync(join(out, 'e2e-edge.csv'), [edHeader, ...edRows].join('\r\n') + '\r\n');

// Ambiguous dates: dd/MM vs MM/dd
const amHeader = 'Variable,Type,03/04/2026,13/04/2026';
writeFileSync(join(out, 'e2e-ambiguous-dates.csv'), [amHeader, 'E2E Ambig,INPUT,1,2'].join('\n') + '\n');

console.log('wrote', ['e2e-main.csv', 'e2e-german.csv', 'e2e-edge.csv', 'e2e-ambiguous-dates.csv'].join(', '));
