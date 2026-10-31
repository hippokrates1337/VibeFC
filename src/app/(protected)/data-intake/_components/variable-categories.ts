import { type Variable } from '@/lib/store/variables';

/** Fixed section order on the data intake page. */
export const VARIABLE_CATEGORY_ORDER: readonly Variable['type'][] = [
  'ACTUAL',
  'BUDGET',
  'INPUT',
  'UNKNOWN'
] as const;

const CATEGORY_LABELS: Record<Variable['type'], string> = {
  ACTUAL: 'Actual',
  BUDGET: 'Budget',
  INPUT: 'Input',
  UNKNOWN: 'Other'
};

/**
 * Human-readable heading for a variable type section.
 */
export function getVariableCategoryLabel(type: Variable['type']): string {
  return CATEGORY_LABELS[type];
}

/**
 * Groups variables by `type`, with variables sorted by name within each group.
 */
export function groupVariablesByType(variables: Variable[]): Record<Variable['type'], Variable[]> {
  const empty: Record<Variable['type'], Variable[]> = {
    ACTUAL: [],
    BUDGET: [],
    INPUT: [],
    UNKNOWN: []
  };

  for (const v of variables) {
    const bucket = empty[v.type] ?? empty.UNKNOWN;
    bucket.push(v);
  }

  (Object.keys(empty) as Variable['type'][]).forEach((key) => {
    empty[key].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  });

  return empty;
}

/**
 * Variables whose name contains every word of `query` (case-insensitive, any order) and,
 * unless `type` is 'ALL', that have that type.
 */
export function filterVariables(
  variables: Variable[],
  query: string,
  type: Variable['type'] | 'ALL' = 'ALL'
): Variable[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return variables.filter((variable) => {
    if (type !== 'ALL' && variable.type !== type) {
      return false;
    }
    const name = variable.name.toLocaleLowerCase();
    return words.every((word) => name.includes(word));
  });
}
