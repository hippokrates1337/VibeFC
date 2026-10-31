import { renderHook, act, waitFor } from '@testing-library/react'
import { useVariableApi, useVariableUsage } from '../api-hooks'
import type { Variable } from '@/lib/store/variables'

const mockFetchVariables = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/store/variables', () => ({
  useFetchVariables: () => mockFetchVariables,
}))
jest.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, session: { access_token: 'token-1' } }),
}))
jest.mock('@/lib/store/organization', () => ({
  useOrganizationStore: (selector: (state: unknown) => unknown) => selector({ currentOrganization: { id: 'org-1' } }),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const units: Variable = { id: 'var-units', name: 'Units', type: 'INPUT', organizationId: 'org-1', timeSeries: [] }

function mockFetch(responses: Array<{ ok: boolean; status?: number; body?: unknown }>): jest.Mock {
  const fetchMock = jest.fn()
  responses.forEach(({ ok, status = ok ? 200 : 400, body = {} }) =>
    fetchMock.mockResolvedValueOnce({ ok, status, json: async () => body }))
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

const sent = (fetchMock: jest.Mock, call: number) => ({
  method: fetchMock.mock.calls[call][1].method,
  body: JSON.parse(fetchMock.mock.calls[call][1].body),
})

describe('useVariableApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // jsdom's crypto has no randomUUID
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => '00000000-0000-4000-8000-000000000001',
    })
  })

  it('imports new variables (POST) and merges into existing ones (PUT), then reloads', async () => {
    const fetchMock = mockFetch([{ ok: true }, { ok: true }])
    const { result } = renderHook(() => useVariableApi([units], jest.fn()))

    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.handleImportVariables([
        { action: 'add', variable: { name: 'Price', type: 'INPUT', points: [{ month: '2026-01', value: 10.5 }] } },
        { action: 'update', targetId: 'var-units', variable: { name: 'Units', type: 'INPUT', points: [{ month: '2026-02', value: 110 }] } },
        { action: 'skip', variable: { name: 'Ignored', type: 'INPUT', points: [] } },
      ])
    })

    expect(saved).toBe(true)
    expect(sent(fetchMock, 0)).toEqual({
      method: 'POST',
      body: { variables: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Price', type: 'INPUT', organization_id: 'org-1', values: [{ date: '2026-01-01', value: 10.5 }] }] },
    })
    // Merge: no replaceValues, so the other months of Units stay
    expect(sent(fetchMock, 1)).toEqual({
      method: 'PUT',
      body: { variables: [{ id: 'var-units', values: [{ date: '2026-02-01', value: 110 }] }] },
    })
    expect(mockFetchVariables).toHaveBeenCalledWith('user-1', 'token-1', { force: true })
    expect(result.current.apiStatus).toEqual({ loading: false, error: null, success: true })
  })

  it('saves an edited series as a replacement and leaves values alone for a rename', async () => {
    const fetchMock = mockFetch([{ ok: true }, { ok: true }])
    const { result } = renderHook(() => useVariableApi([units], jest.fn()))

    await act(async () => {
      await result.current.handleUpdateVariable('var-units', { timeSeries: [{ month: '2026-01', value: null }] }, 'org-1')
      await result.current.handleUpdateVariable('var-units', { name: 'Units sold' }, 'org-1')
    })

    expect(sent(fetchMock, 0).body).toEqual({ variables: [{ id: 'var-units', values: [{ date: '2026-01-01', value: null }], replaceValues: true }] })
    expect(sent(fetchMock, 1).body).toEqual({ variables: [{ id: 'var-units', name: 'Units sold' }] })
  })

  it('creates a variable by hand', async () => {
    const fetchMock = mockFetch([{ ok: true }])
    const { result } = renderHook(() => useVariableApi([], jest.fn()))

    await act(async () => {
      await result.current.handleCreateVariable({ name: 'Headcount', type: 'UNKNOWN', timeSeries: [{ month: '2026-03', value: 12 }] }, 'org-1')
    })

    expect(sent(fetchMock, 0)).toEqual({
      method: 'POST',
      body: { variables: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Headcount', type: 'UNKNOWN', organization_id: 'org-1', values: [{ date: '2026-03-01', value: 12 }] }] },
    })
  })

  it('reports the server message and does not reload when saving fails', async () => {
    mockFetch([{ ok: false, status: 400, body: { message: 'Invalid values: value "x" is not a finite number or null' } }])
    const { result } = renderHook(() => useVariableApi([units], jest.fn()))

    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.handleUpdateVariable('var-units', { name: 'X' }, 'org-1')
    })

    expect(saved).toBe(false)
    expect(result.current.apiStatus.error).toBe('Invalid values: value "x" is not a finite number or null')
    expect(mockFetchVariables).not.toHaveBeenCalled()
  })

  it('removes a deleted variable from the store', async () => {
    const fetchMock = mockFetch([{ ok: true }])
    const setVariables = jest.fn()
    const { result } = renderHook(() => useVariableApi([units], setVariables))

    await act(async () => {
      await result.current.handleDeleteVariable('var-units', 'org-1')
    })

    expect(sent(fetchMock, 0)).toEqual({ method: 'DELETE', body: { ids: ['var-units'], organizationId: 'org-1' } })
    expect(setVariables).toHaveBeenCalledWith([])
  })
})

describe('useVariableUsage', () => {
  it('loads the forecasts that use the variable', async () => {
    const fetchMock = mockFetch([{ ok: true, body: { forecasts: [{ id: 'f-1', name: 'Budget 2026' }] } }])
    const { result } = renderHook(() => useVariableUsage('var-units'))

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('loaded'))
    expect(result.current.forecasts).toEqual([{ id: 'f-1', name: 'Budget 2026' }])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/data-intake/variables/item/var-units/usage')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer token-1' })
  })

  it('reports a failed lookup and stays idle without a variable', async () => {
    mockFetch([{ ok: false, status: 500 }])
    const { result, rerender } = renderHook(({ id }) => useVariableUsage(id), { initialProps: { id: 'var-units' as string | null } })

    await waitFor(() => expect(result.current.status).toBe('failed'))
    rerender({ id: null })
    expect(result.current).toEqual({ status: 'idle', forecasts: [] })
  })
})
