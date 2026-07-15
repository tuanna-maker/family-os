import { describe, it, expect, vi } from "vitest";
import {
  normalizeUsername,
  resolveLoginEmailImpl,
  RESOLVE_MIN_RESPONSE_MS,
  type ResolveDeps,
} from "./username.functions";

function makeDeps(overrides: Partial<ResolveDeps> = {}): {
  deps: ResolveDeps;
  rpc: ReturnType<typeof vi.fn>;
  insertAudit: ReturnType<typeof vi.fn>;
} {
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const insertAudit = vi.fn(async () => undefined);
  const deps: ResolveDeps = {
    rpc: rpc as unknown as ResolveDeps["rpc"],
    insertAudit,
    getIP: () => "127.0.0.1",
    getUA: () => "vitest-ua",
    sleep: async () => undefined, // bỏ qua delay trong test logic
    now: () => 0,
    ...overrides,
  };
  return { deps, rpc, insertAudit };
}

describe("normalizeUsername", () => {
  it("trim + lowercase + bỏ khoảng trắng giữa", () => {
    expect(normalizeUsername("  John.Doe  ")).toBe("john.doe");
    expect(normalizeUsername("Jo hn")).toBe("john");
  });
  it("loại zero-width và NBSP", () => {
    expect(normalizeUsername("ab\u200Bc\u00A0d")).toBe("abcd");
  });
  it("NFKC normalize fullwidth", () => {
    expect(normalizeUsername("ｕｓｅｒ")).toBe("user");
  });
  it("non-string -> rỗng", () => {
    expect(normalizeUsername(null)).toBe("");
    expect(normalizeUsername(123)).toBe("");
  });
});

describe("resolveLoginEmailImpl", () => {
  it("found: trả email khi username hợp lệ + tồn tại", async () => {
    const rpc = vi.fn(async () => ({ data: "user@example.com", error: null }));
    const { deps } = makeDeps({ rpc: rpc as unknown as ResolveDeps["rpc"] });
    const res = await resolveLoginEmailImpl("JohnDoe", deps);
    expect(res).toEqual({ email: "user@example.com" });
    expect(rpc).toHaveBeenCalledWith("resolve_login_email", { _username: "johndoe" });
  });

  it("not_found: trả {email: null} khi RPC trả null", async () => {
    const { deps } = makeDeps();
    const res = await resolveLoginEmailImpl("ghost", deps);
    expect(res).toEqual({ email: null });
  });

  it("invalid_input ngắn: trả {email: null}, không gọi RPC", async () => {
    const { deps, rpc } = makeDeps();
    expect(await resolveLoginEmailImpl("a", deps)).toEqual({ email: null });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("invalid_input ký tự lạ: trả {email: null}, không gọi RPC", async () => {
    const { deps, rpc } = makeDeps();
    expect(await resolveLoginEmailImpl("john doe!", deps)).toEqual({ email: null });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("non-string: trả {email: null}, không gọi RPC", async () => {
    const { deps, rpc } = makeDeps();
    expect(await resolveLoginEmailImpl(123 as unknown, deps)).toEqual({ email: null });
    expect(await resolveLoginEmailImpl(null, deps)).toEqual({ email: null });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rpc trả error: trả {email: null} (không throw)", async () => {
    const { deps } = makeDeps({
      rpc: vi.fn(async () => ({ data: null, error: { message: "boom" } })) as unknown as ResolveDeps["rpc"],
    });
    expect(await resolveLoginEmailImpl("johndoe", deps)).toEqual({ email: null });
  });

  it("rpc throw: trả {email: null} (không throw)", async () => {
    const { deps } = makeDeps({
      rpc: vi.fn(async () => { throw new Error("network"); }) as unknown as ResolveDeps["rpc"],
    });
    expect(await resolveLoginEmailImpl("johndoe", deps)).toEqual({ email: null });
  });

  it("insertAudit throw: vẫn trả kết quả bình thường", async () => {
    const { deps } = makeDeps({
      rpc: vi.fn(async () => ({ data: "x@y.z", error: null })) as unknown as ResolveDeps["rpc"],
      insertAudit: vi.fn(async () => { throw new Error("audit down"); }),
    });
    expect(await resolveLoginEmailImpl("johndoe", deps)).toEqual({ email: "x@y.z" });
  });

  it("audit log: outcome=found + username_hash, KHÔNG lộ plaintext", async () => {
    const { deps, insertAudit } = makeDeps({
      rpc: vi.fn(async () => ({ data: "x@y.z", error: null })) as unknown as ResolveDeps["rpc"],
    });
    await resolveLoginEmailImpl("JohnDoe", deps);
    expect(insertAudit).toHaveBeenCalledTimes(1);
    const payload = insertAudit.mock.calls[0][0] as {
      action: string;
      metadata: { outcome: string; username_hash: string };
    };
    expect(payload.action).toBe("auth.resolve_login_email");
    expect(payload.metadata.outcome).toBe("found");
    expect(payload.metadata.username_hash).toMatch(/^[0-9a-f]{12}$/);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("JohnDoe");
    expect(serialized).not.toContain("johndoe");
  });

  it("audit log: outcome=not_found / invalid_input / error", async () => {
    // not_found
    {
      const { deps, insertAudit } = makeDeps();
      await resolveLoginEmailImpl("ghost", deps);
      expect((insertAudit.mock.calls[0][0] as { metadata: { outcome: string } }).metadata.outcome).toBe("not_found");
    }
    // invalid_input
    {
      const { deps, insertAudit } = makeDeps();
      await resolveLoginEmailImpl("a", deps);
      expect((insertAudit.mock.calls[0][0] as { metadata: { outcome: string } }).metadata.outcome).toBe("invalid_input");
    }
    // error
    {
      const { deps, insertAudit } = makeDeps({
        rpc: vi.fn(async () => ({ data: null, error: { message: "boom" } })) as unknown as ResolveDeps["rpc"],
      });
      await resolveLoginEmailImpl("johndoe", deps);
      expect((insertAudit.mock.calls[0][0] as { metadata: { outcome: string } }).metadata.outcome).toBe("error");
    }
  });

  it("timing floor: gọi sleep với delta đủ để chạm RESOLVE_MIN_RESPONSE_MS", async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
    let t = 0;
    const now = () => {
      const v = t;
      t += 10;
      return v;
    };
    const { deps } = makeDeps({ sleep, now });
    await resolveLoginEmailImpl("johndoe", deps);
    expect(sleep).toHaveBeenCalledTimes(1);
    const ms = sleep.mock.calls[0][0];
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(RESOLVE_MIN_RESPONSE_MS);
  });

  it("timing floor: không sleep nếu đã vượt ngưỡng", async () => {
    const sleep = vi.fn(async () => undefined);
    let calls = 0;
    const now = () => (calls++ === 0 ? 0 : RESOLVE_MIN_RESPONSE_MS + 50);
    const { deps } = makeDeps({ sleep, now });
    await resolveLoginEmailImpl("johndoe", deps);
    expect(sleep).not.toHaveBeenCalled();
  });
});
