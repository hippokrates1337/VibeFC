import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchUserVariables, useVariables, useReloadVariables } from '../variables';
import { toStoreVariable } from '@/lib/store/variables';

const mockGetSession = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

const session = { access_token: 'token-1', user: { id: 'user-1' } };
const apiVariables = [
  { id: 'v1', name: 'Revenue', type: 'ACTUAL', organization_id: 'org-1', values: [{ date: '2026-01-01', value: '10' }, { date: '2026-02-01', value: null }] },
  { id: 'v2', name: 'Budget', type: 'BUDGET', organization_id: 'org-2', values: [] },
];

function mockFetch(response: { ok: boolean; status?: number; body?: unknown }): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
};

describe('toStoreVariable', () => {
  it('maps API points to months, numbers and null', () => {
    expect(toStoreVariable(apiVariables[0])).toEqual({
      id: 'v1',
      name: 'Revenue',
      type: 'ACTUAL',
      organizationId: 'org-1',
      timeSeries: [
        { month: '2026-01', value: 10 },
        { month: '2026-02', value: null },
      ],
    });
  });
});

describe('fetchUserVariables', () => {
  beforeEach(() => mockGetSession.mockResolvedValue({ data: { session } }));

  it("loads the signed-in user's variables with a fresh token", async () => {
    const fetchMock = mockFetch({ ok: true, body: { variables: apiVariables } });

    const variables = await fetchUserVariables();

    expect(variables.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(fetchMock).toHaveBeenCalledWith('/api/data-intake/variables/user/user-1', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token-1' }),
    }));
  });

  it('returns nothing when signed out, without a request', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = mockFetch({ ok: true, body: {} });

    expect(await fetchUserVariables()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws the server's message", async () => {
    mockFetch({ ok: false, status: 403, body: { message: 'Forbidden' } });

    await expect(fetchUserVariables()).rejects.toThrow('Forbidden');
  });
});

describe('useVariables', () => {
  beforeEach(() => mockGetSession.mockResolvedValue({ data: { session } }));

  it('filters one load per organization: switching needs no new request', async () => {
    const fetchMock = mockFetch({ ok: true, body: { variables: apiVariables } });
    const { Wrapper } = wrapper();

    const { result, rerender } = renderHook(({ org }) => useVariables(org), {
      wrapper: Wrapper,
      initialProps: { org: 'org-1' as string | null | undefined },
    });
    await waitFor(() => expect(result.current.data?.map((v) => v.id)).toEqual(['v1']));

    rerender({ org: 'org-2' });
    expect(result.current.data?.map((v) => v.id)).toEqual(['v2']);
    rerender({ org: null });
    expect(result.current.data).toEqual([]);
    rerender({ org: undefined });
    expect(result.current.data?.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reloads after a save', async () => {
    const fetchMock = mockFetch({ ok: true, body: { variables: apiVariables } });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => ({ variables: useVariables('org-1'), reload: useReloadVariables() }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.variables.isSuccess).toBe(true));

    await result.current.reload();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
