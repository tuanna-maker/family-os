import { vi } from "vitest";

type Row = Record<string, unknown>;

export type MockQueryResult = {
  data?: Row | Row[] | null;
  error?: { message: string } | null;
  count?: number | null;
};

const CHAIN_METHODS = [
  "select", "insert", "update", "delete", "upsert",
  "eq", "neq", "in", "is", "not", "gte", "lte", "order", "limit", "range",
  "single", "maybeSingle",
] as const;

function makeThenable(resultFn: () => Promise<MockQueryResult>) {
  const p = resultFn();
  const builder: Record<string, unknown> = {};
  for (const m of CHAIN_METHODS) {
    builder[m] = vi.fn(() => {
      if (m === "single" || m === "maybeSingle") return p;
      return builder;
    });
  }
  builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    p.then(onFulfilled, onRejected);
  return builder;
}

/** Fluent mock for supabase.from().select().eq()... chains */
export function createMockSupabase(handlers: Record<string, () => MockQueryResult | Promise<MockQueryResult>>) {
  const invoke = vi.fn();
  const channel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }));

  const from = vi.fn((table: string) => {
    const resolve = async (op: string) => {
      const key = `${table}:${op}`;
      const fn = handlers[key] ?? handlers[`${table}:*`] ?? handlers["*"];
      if (!fn) return { data: null, error: null, count: 0 };
      return fn();
    };

    return {
      select: () => makeThenable(() => resolve("select")),
      insert: () => makeThenable(() => resolve("insert")),
      update: () => makeThenable(() => resolve("update")),
      delete: () => makeThenable(() => resolve("delete")),
      upsert: () => makeThenable(() => resolve("upsert")),
    };
  });

  const rpc = vi.fn((name: string) =>
    makeThenable(async () => {
      const key = `rpc:${name}`;
      const fn = handlers[key] ?? handlers["rpc:*"] ?? handlers["*"];
      if (!fn) return { data: null, error: null };
      return fn();
    }),
  );

  return {
    supabase: {
      from,
      rpc,
      functions: { invoke },
      channel,
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    },
    from,
    rpc,
    invoke,
    channel,
  };
}

export function mockRequireUser(mock: ReturnType<typeof createMockSupabase>, userId = "test-user-id") {
  return {
    supabase: mock.supabase,
    userId,
    user: { id: userId, email: "test@example.com" },
  };
}
