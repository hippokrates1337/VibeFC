/**
 * A fake Supabase client for service tests: every query is recorded and answered by
 * `respond`, so a test states what the database returns and checks what was asked.
 * (src/common/testing is excluded from the build in tsconfig.build.json.)
 */
export interface RecordedQuery {
  table: string;
  /** 'select' | 'insert' | 'update' | 'delete' | 'upsert' (the first write wins over select) */
  op: string;
  payload?: unknown;
  /** Filters in call order, e.g. ['eq', 'id', 'n1'] */
  filters: Array<[string, ...unknown[]]>;
  /** Options passed to the operation, e.g. { count: 'exact' } */
  options?: unknown;
}

export interface FakeResult {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
  count?: number | null;
}

export function fakeSupabase(respond: (query: RecordedQuery) => FakeResult = () => ({ data: null })) {
  const queries: RecordedQuery[] = [];
  const rpcCalls: Array<{ name: string; args: unknown }> = [];
  let rpcResult: FakeResult = { data: null };

  const builder = (table: string) => {
    const query: RecordedQuery = { table, op: 'select', filters: [] };
    queries.push(query);
    const answer = () => Promise.resolve({ data: null, error: null, count: null, ...respond(query) });
    const chain: any = {
      then: (resolve: any, reject: any) => answer().then(resolve, reject),
    };
    for (const op of ['insert', 'update', 'delete', 'upsert']) {
      chain[op] = (payload?: unknown, options?: unknown) => {
        query.op = op;
        if (op === 'delete') {
          query.options = payload;
        } else {
          query.payload = payload;
          query.options = options;
        }
        return chain;
      };
    }
    chain.select = (..._args: unknown[]) => chain;
    for (const filter of ['eq', 'neq', 'in', 'or', 'ilike', 'order', 'limit', 'is']) {
      chain[filter] = (...args: unknown[]) => {
        query.filters.push([filter, ...args]);
        return chain;
      };
    }
    chain.single = answer;
    chain.maybeSingle = answer;
    return chain;
  };

  const client = {
    from: jest.fn(builder),
    rpc: jest.fn((name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: null, ...rpcResult });
    }),
  };

  return {
    client,
    queries,
    rpcCalls,
    setRpcResult: (result: FakeResult) => {
      rpcResult = result;
    },
    supabaseService: { getClientForRequest: () => client } as any,
    /** The value of the first `eq` filter on `column`, for assertions. */
    eqValue: (query: RecordedQuery, column: string) => query.filters.find(([f, c]) => f === 'eq' && c === column)?.[2],
  };
}

export const rlsError = { code: '42501', message: 'new row violates row-level security policy for table "x"' };
