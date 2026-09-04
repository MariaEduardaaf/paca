/**
 * Minimal stand-in for the Supabase JS client, good enough for the query shapes
 * the _shared helpers build:
 *
 *   from(t).select(cols).eq(c, v).maybeSingle()            -> { data, error }
 *   from(t).select(cols, { count, head }).in().gte().eq()  -> awaited { count, error }
 *
 * It records every table/filter the code under test asked for, and returns
 * exactly the result the test dictates. No network, no Deno, no Supabase.
 */

export interface RecordedFilter {
  op: "eq" | "in" | "gte";
  column: string;
  value: unknown;
}

export interface RecordedQuery {
  table: string;
  columns: string;
  options: Record<string, unknown> | undefined;
  filters: RecordedFilter[];
  terminal: "maybeSingle" | "await" | null;
}

/** What the fake resolves with. `data` for maybeSingle, `count` for head counts. */
export interface FakeResult {
  data?: unknown;
  count?: number | null;
  error?: unknown;
}

export interface FakeSupabase {
  /** Every query built during the test, in order. */
  queries: RecordedQuery[];
  /** The single query built — throws if there wasn't exactly one. */
  onlyQuery(): RecordedQuery;
  /** Value of the first filter recorded for `column` with `op`. */
  filterValue(op: RecordedFilter["op"], column: string): unknown;
}

type ResultFor = FakeResult | ((query: RecordedQuery) => FakeResult);

/**
 * `result` is either a fixed result or a function of the recorded query, so a
 * test can answer differently depending on what was asked.
 *
 * Returns `[client, spy]`: the client is deliberately untyped (`any`) because
 * it impersonates SupabaseClient without implementing its full surface — the
 * helpers under test only touch the handful of methods below.
 */
export function createFakeSupabase(
  result: ResultFor,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): [any, FakeSupabase] {
  const queries: RecordedQuery[] = [];

  const spy: FakeSupabase = {
    queries,
    onlyQuery() {
      if (queries.length !== 1) {
        throw new Error(`expected exactly 1 query, got ${queries.length}`);
      }
      return queries[0];
    },
    filterValue(op, column) {
      for (const q of queries) {
        const hit = q.filters.find((f) => f.op === op && f.column === column);
        if (hit) return hit.value;
      }
      throw new Error(`no ${op} filter on "${column}" was recorded`);
    },
  };

  const resolve = (query: RecordedQuery): FakeResult =>
    typeof result === "function" ? result(query) : result;

  const client = {
    from(table: string) {
      const query: RecordedQuery = {
        table,
        columns: "",
        options: undefined,
        filters: [],
        terminal: null,
      };
      queries.push(query);

      const builder = {
        select(columns: string, options?: Record<string, unknown>) {
          query.columns = columns;
          query.options = options;
          return builder;
        },
        eq(column: string, value: unknown) {
          query.filters.push({ op: "eq", column, value });
          return builder;
        },
        in(column: string, value: unknown) {
          query.filters.push({ op: "in", column, value });
          return builder;
        },
        gte(column: string, value: unknown) {
          query.filters.push({ op: "gte", column, value });
          return builder;
        },
        maybeSingle() {
          query.terminal = "maybeSingle";
          const r = resolve(query);
          return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
        },
        // Awaiting the builder itself (the count queries) resolves here.
        then(
          onFulfilled: (value: { count: number | null; error: unknown }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          query.terminal = "await";
          const r = resolve(query);
          return Promise.resolve({
            count: r.count ?? null,
            error: r.error ?? null,
          }).then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
  };

  return [client, spy];
}
