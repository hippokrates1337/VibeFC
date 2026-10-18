/**
 * Side-by-side run of the old tree engine and the new DAG engine (Phase 3, step d).
 * Not a pass/fail test of either engine: it classifies where they differ and writes a
 * report. Run with TZ=UTC (the old engine is off by a month east of UTC):
 *   TZ=UTC PARITY_REPORT=parity.json npx jest -w backend forecast-engine.parity
 * Deleted together with the old engine.
 */
import { Test } from '@nestjs/testing';
import { writeFileSync } from 'fs';
import { formatMonth } from '@vibefc/forecast-engine';
import { CalculationEngineCoreModule } from '../calculation-engine/calculation-engine-core.module';
import { CalculationEngineCore } from '../calculation-engine/calculation-engine-core';
import { GraphConverter } from '../calculation-engine/graph-converter';
import { ForecastEngineService } from '../forecast-engine.service';
import { generateCase } from '../../../../../packages/forecast-engine/src/__tests__/support/random-graph';
import type { CalculateInput } from '@vibefc/forecast-engine';

const CASES = Number(process.env.PARITY_CASES ?? 400);
const TYPES = ['historical', 'forecast', 'budget'] as const;

/** Engine input -> database-shaped rows, as ForecastCalculationService loads them. */
function toRows(testCase: CalculateInput, missingAsZero: boolean) {
  const nodes = testCase.nodes.map((n) => ({
    id: n.id,
    forecastId: 'f',
    kind: n.type,
    attributes: n.type === 'DATA' && missingAsZero ? { ...(n.data as object), missingAsZero: true } : n.data,
    position: { x: 0, y: 0 },
  }));
  const edges = testCase.edges.map((e) => ({ id: e.id, forecastId: 'f', sourceNodeId: e.source, targetNodeId: e.target }));
  const variables = testCase.variables.map((v) => ({
    id: v.id,
    name: v.id,
    type: v.type,
    organization_id: 'o',
    values: v.values.map((p) => {
      const [mm, yyyy] = formatMonth(p.month).split('-');
      return { date: `${yyyy}-${mm}-01`, value: p.value };
    }),
  }));
  const periods = {
    actualStartMonth: formatMonth(testCase.windows.actual.start),
    actualEndMonth: formatMonth(testCase.windows.actual.end),
    forecastStartMonth: formatMonth(testCase.windows.forecast.start),
    forecastEndMonth: formatMonth(testCase.windows.forecast.end),
  };
  return { nodes, edges, variables, periods };
}

type Rows = ReturnType<typeof toRows>;
type Values = Record<string, Record<string, Record<string, number | null>>>;

async function runOld(engine: CalculationEngineCore, rows: Rows, types: readonly string[]): Promise<Values> {
  const trees = new GraphConverter().convertToCalculationTrees(
    rows.nodes.map((n) => ({ id: n.id, type: n.kind as any, data: n.attributes, position: n.position })),
    rows.edges.map((e) => ({ id: e.id, source: e.sourceNodeId, target: e.targetNodeId }))
  );
  const result = await engine.calculate({
    trees,
    periods: {
      forecast: { start: rows.periods.forecastStartMonth, end: rows.periods.forecastEndMonth },
      actual: { start: rows.periods.actualStartMonth, end: rows.periods.actualEndMonth },
    },
    calculationTypes: types as any,
    includeAllNodes: true,
    variables: rows.variables.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type as any,
      organizationId: 'o',
      timeSeries: v.values.map((p) => ({ date: new Date(p.date), value: p.value })),
    })),
  });
  const out: Values = {};
  for (const node of result.nodeResults) {
    out[node.nodeId] = {};
    for (const v of node.values) out[node.nodeId][v.month] = { historical: v.historical, forecast: v.forecast, budget: v.budget };
  }
  return out;
}

function runNew(service: ForecastEngineService, rows: Rows, types: readonly string[]): Values {
  const { nodeResults } = service.run({ ...rows, nodes: rows.nodes as any, edges: rows.edges as any, calculationTypes: types as any });
  const out: Values = {};
  for (const node of nodeResults) {
    out[node.nodeId] = {};
    for (const v of node.values) out[node.nodeId][v.month] = { historical: v.historical, forecast: v.forecast, budget: v.budget };
  }
  return out;
}

const close = (a: number | null, b: number | null) =>
  a === b || (a !== null && b !== null && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)));

/** Differences on nodes the old engine returned (it leaves out nodes no metric reaches). */
function diff(oldValues: Values, newValues: Values) {
  const diffs: Array<{ node: string; month: string; type: string; old: number | null; new: number | null }> = [];
  for (const node of Object.keys(oldValues)) {
    for (const month of Object.keys(oldValues[node])) {
      for (const type of TYPES) {
        const o = oldValues[node][month][type];
        const n = newValues[node]?.[month]?.[type] ?? null;
        if (!close(o, n)) diffs.push({ node, month, type, old: o, new: n });
      }
    }
  }
  return diffs;
}

describe('old vs new engine (parity report)', () => {
  jest.setTimeout(600000);

  it('classifies differences', async () => {
    const quiet = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const quietWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const quietError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({ imports: [CalculationEngineCoreModule] }).compile();
    const oldEngine = moduleRef.get(CalculationEngineCore);
    const newEngine = new ForecastEngineService();

    const report = {
      cases: 0,
      oldRejected: [] as Array<{ seed: number; error: string }>,
      identical: 0,
      identicalWithMissingAsZero: 0,
      differing: [] as Array<{ seed: number; count: number; sample: unknown[]; nodeTypes: string[]; graph: unknown }>,
    };

    for (let seed = 1; seed <= CASES; seed++) {
      const testCase = generateCase(seed, { legacyCompatible: true });
      const types = testCase.calculationTypes;
      report.cases++;
      let oldValues: Values;
      try {
        oldValues = await runOld(oldEngine, toRows(testCase, false), types);
      } catch (error) {
        report.oldRejected.push({ seed, error: String((error as Error).message).slice(0, 300) });
        continue;
      }
      const raw = diff(oldValues, runNew(newEngine, toRows(testCase, false), types));
      if (raw.length === 0) {
        report.identical++;
        continue;
      }
      // Old: missing DATA -> 0. Re-run the new engine with missingAsZero on every DATA node.
      const compat = diff(oldValues, runNew(newEngine, toRows(testCase, true), types));
      if (compat.length === 0) {
        report.identicalWithMissingAsZero++;
        continue;
      }
      report.differing.push({
        seed,
        count: compat.length,
        sample: compat.slice(0, 4),
        graph: { nodes: testCase.nodes, edges: testCase.edges, windows: testCase.windows, types },
        nodeTypes: Array.from(new Set(testCase.nodes.map((n) => n.type))).sort(),
      });
    }

    quiet.mockRestore();
    quietWarn.mockRestore();
    quietError.mockRestore();
    if (process.env.PARITY_REPORT) {
      writeFileSync(process.env.PARITY_REPORT, JSON.stringify(report, null, 2));
    }
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        cases: report.cases,
        oldRejected: report.oldRejected.length,
        identical: report.identical,
        identicalWithMissingAsZero: report.identicalWithMissingAsZero,
        differing: report.differing.length,
      })
    );
    expect(report.cases).toBe(CASES);
  });
});
