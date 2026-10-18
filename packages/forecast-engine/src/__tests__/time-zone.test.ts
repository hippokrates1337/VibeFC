/**
 * Old defect 5: the old engine built local-time dates and read them with UTC getters,
 * so every lookup was one month early east of UTC.
 *
 * Jest gives each test file its own copy of process.env, so a test cannot switch the
 * process time zone. Instead CI runs this whole suite under TZ=UTC and TZ=Europe/Berlin,
 * and this file checks that the engine never touches a local-time Date API at all.
 */
import { calculate } from '../calculate';
import { monthIndexFromDateString } from '../months';
import { generateCase } from './support/random-graph';
import { constant, data, edge, input, metric, op } from './support/builders';

const LOCAL_TIME_METHODS = [
  'getFullYear',
  'getMonth',
  'getDate',
  'getDay',
  'getHours',
  'getTimezoneOffset',
  'setFullYear',
  'setMonth',
  'setDate',
  'setHours',
  'toLocaleDateString',
  'toDateString',
] as const;

describe('time zones', () => {
  it('January data is read in January (in whatever zone this suite runs)', () => {
    const v = {
      id: 'v',
      type: 'INPUT',
      values: ['2024-12-01', '2025-01-01', '2025-02-01'].map((d, i) => ({
        month: monthIndexFromDateString(d),
        value: (i + 1) * 10,
      })),
    };
    const result = calculate(
      input(
        [data('X', 'v'), constant('one', 1), op('add', '+', ['X', 'one']), metric('M')],
        [edge('X', 'add'), edge('one', 'add'), edge('add', 'M')],
        { variables: [v], actual: ['12-2024', '12-2024'], forecast: ['01-2025', '02-2025'] }
      )
    );
    if (!result.ok) {
      throw new Error('refused');
    }
    expect(result.nodes.find((n) => n.nodeId === 'M')!.values.map((x) => x.forecast)).toEqual([null, 21, 31]);
  });

  it('calculation never calls a local-time Date method', () => {
    const spies = LOCAL_TIME_METHODS.map((method) => jest.spyOn(Date.prototype, method));
    try {
      for (let seed = 1; seed <= 50; seed++) {
        calculate({ ...generateCase(seed), trace: true });
      }
      monthIndexFromDateString('2025-01-01');
      monthIndexFromDateString('2025-01-01T00:00:00+01:00');
      for (const spy of spies) {
        expect({ method: spy.getMockName(), calls: spy.mock.calls.length }).toEqual({ method: spy.getMockName(), calls: 0 });
      }
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});
