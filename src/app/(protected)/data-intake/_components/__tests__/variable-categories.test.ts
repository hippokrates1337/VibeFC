import { groupVariablesByType, getVariableCategoryLabel, VARIABLE_CATEGORY_ORDER, filterVariables } from '../variable-categories';
import { type Variable } from '@/lib/store/variables';

const baseVar = (overrides: Partial<Variable>): Variable => ({
  id: 'id',
  name: 'Name',
  type: 'ACTUAL',
  organizationId: 'org',
  timeSeries: [],
  ...overrides
});

describe('variable-categories', () => {
  describe('VARIABLE_CATEGORY_ORDER', () => {
    it('lists ACTUAL, BUDGET, INPUT, then UNKNOWN', () => {
      expect([...VARIABLE_CATEGORY_ORDER]).toEqual([
        'ACTUAL',
        'BUDGET',
        'INPUT',
        'UNKNOWN'
      ]);
    });
  });

  describe('getVariableCategoryLabel', () => {
    it('returns expected section titles', () => {
      expect(getVariableCategoryLabel('ACTUAL')).toBe('Actual');
      expect(getVariableCategoryLabel('BUDGET')).toBe('Budget');
      expect(getVariableCategoryLabel('INPUT')).toBe('Input');
      expect(getVariableCategoryLabel('UNKNOWN')).toBe('Other');
    });
  });

  describe('groupVariablesByType', () => {
    it('buckets by type and sorts names within each bucket', () => {
      const variables: Variable[] = [
        baseVar({ id: '1', name: 'Zeta', type: 'ACTUAL' }),
        baseVar({ id: '2', name: 'Alpha', type: 'ACTUAL' }),
        baseVar({ id: '3', name: 'Beta', type: 'BUDGET' }),
        baseVar({ id: '4', name: 'Gamma', type: 'INPUT' }),
        baseVar({ id: '5', name: 'Delta', type: 'UNKNOWN' })
      ];

      const grouped = groupVariablesByType(variables);

      expect(grouped.ACTUAL.map((v) => v.name)).toEqual(['Alpha', 'Zeta']);
      expect(grouped.BUDGET.map((v) => v.name)).toEqual(['Beta']);
      expect(grouped.INPUT.map((v) => v.name)).toEqual(['Gamma']);
      expect(grouped.UNKNOWN.map((v) => v.name)).toEqual(['Delta']);
    });

    it('returns empty arrays for missing types', () => {
      const grouped = groupVariablesByType([baseVar({ id: 'a', name: 'Only', type: 'INPUT' })]);

      expect(grouped.ACTUAL).toEqual([]);
      expect(grouped.BUDGET).toEqual([]);
      expect(grouped.INPUT).toHaveLength(1);
      expect(grouped.UNKNOWN).toEqual([]);
    });
  });
});

describe('filterVariables', () => {
  const variables = [
    baseVar({ id: '1', name: 'Revenue Germany', type: 'ACTUAL' }),
    baseVar({ id: '2', name: 'Revenue France', type: 'BUDGET' }),
    baseVar({ id: '3', name: 'Headcount', type: 'INPUT' }),
  ];
  const ids = (list: Variable[]) => list.map((v) => v.id);

  it('matches every word of the query in any order, ignoring case', () => {
    expect(ids(filterVariables(variables, 'revenue'))).toEqual(['1', '2']);
    expect(ids(filterVariables(variables, 'germany REV'))).toEqual(['1']);
    expect(ids(filterVariables(variables, '  '))).toEqual(['1', '2', '3']);
    expect(ids(filterVariables(variables, 'cost'))).toEqual([]);
  });

  it('narrows to one type', () => {
    expect(ids(filterVariables(variables, 'revenue', 'BUDGET'))).toEqual(['2']);
    expect(ids(filterVariables(variables, '', 'INPUT'))).toEqual(['3']);
  });
});
