import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { VariableList } from '../variable-list'
import type { Variable } from '@/lib/store/variables'

const variable = (id: string, name: string, type: Variable['type']): Variable => ({
  id, name, type, organizationId: 'org-1', timeSeries: [{ month: '2026-01', value: 1 }],
})

const variables = [
  variable('1', 'Revenue Germany', 'ACTUAL'),
  variable('2', 'Revenue France', 'BUDGET'),
  variable('3', 'Headcount', 'INPUT'),
]

const renderList = () => render(<VariableList variables={variables} onDelete={jest.fn()} onViewDetails={jest.fn()} />)
const listedNames = () => within(screen.getByTestId('data-table')).queryAllByText(/Revenue|Headcount/).map((el) => el.textContent)

describe('VariableList', () => {
  test('shows all variables grouped by type without a count', () => {
    renderList()
    expect(listedNames()).toEqual(['Revenue Germany', 'Revenue France', 'Headcount'])
    expect(screen.queryByTestId('variable-filter-count')).not.toBeInTheDocument()
  })

  test('filters by name as you type and shows how many match', async () => {
    const user = userEvent.setup()
    renderList()

    await user.type(screen.getByRole('searchbox', { name: 'Search variables' }), 'revenue ger')

    expect(listedNames()).toEqual(['Revenue Germany'])
    expect(screen.getByTestId('variable-filter-count')).toHaveTextContent('1 of 3 variables')
  })

  test('filters by type and says when nothing matches', async () => {
    const user = userEvent.setup()
    renderList()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Variable type' }), 'BUDGET')
    expect(listedNames()).toEqual(['Revenue France'])

    await user.type(screen.getByRole('searchbox', { name: 'Search variables' }), 'germany')
    expect(screen.getByText('No variables match the search.')).toBeInTheDocument()
    expect(screen.getByTestId('variable-filter-count')).toHaveTextContent('0 of 3 variables')
  })
})
