'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import type { Variable } from '@/lib/store/variables'
import { Input } from '@/components/ui/input'
import { VariableListRow } from './variable-list-row'
import {
  filterVariables,
  groupVariablesByType,
  getVariableCategoryLabel,
  VARIABLE_CATEGORY_ORDER
} from './variable-categories'

interface VariableListProps {
  variables: Variable[]
  onDelete: (id: string, name: string) => void
  onViewDetails: (variable: Variable) => void
}

/** The organization's variables grouped by type, with a name search and a type filter. */
export function VariableList({ variables, onDelete, onViewDetails }: VariableListProps): ReactNode {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<Variable['type'] | 'ALL'>('ALL')

  const visible = useMemo(() => filterVariables(variables, query, type), [variables, query, type])
  const grouped = groupVariablesByType(visible)
  const isFiltered = query.trim() !== '' || type !== 'ALL'

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            aria-label="Search variables"
            placeholder="Search variables"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8 bg-slate-800 border-slate-700 text-slate-100"
          />
        </div>
        <select
          aria-label="Variable type"
          value={type}
          onChange={(event) => setType(event.target.value as Variable['type'] | 'ALL')}
          className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
        >
          <option value="ALL">All types</option>
          {VARIABLE_CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>
              {getVariableCategoryLabel(category)}
            </option>
          ))}
        </select>
        {isFiltered && (
          <span className="text-sm text-slate-400" data-testid="variable-filter-count">
            {visible.length} of {variables.length} variables
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-400">No variables match the search.</p>
      ) : (
        <div className="flex flex-col gap-8" data-testid="data-table">
          {VARIABLE_CATEGORY_ORDER.map((category) => {
            const vars = grouped[category]
            if (vars.length === 0) {
              return null
            }
            const sectionId = `data-intake-category-${category}`
            return (
              <section key={category} aria-labelledby={sectionId}>
                <h2 id={sectionId} className="mb-3 text-lg font-semibold tracking-tight text-slate-200">
                  {getVariableCategoryLabel(category)}
                </h2>
                <div className="flex flex-col gap-2">
                  {vars.map((variable) => (
                    <VariableListRow
                      key={variable.id}
                      variable={variable}
                      onDelete={onDelete}
                      onViewDetails={onViewDetails}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
