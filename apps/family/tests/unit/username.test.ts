import { describe, expect, it, vi } from "vitest";

vi.mock("@shared/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from "@shared/supabase/client";
import { normalizeUsername, resolveLoginEmail, checkUsernameAvailable } from "@/api/username";

describe("username API", () => {
  it("normalizeUsername lowercases and strips spaces", () => {
    expect(normalizeUsername("  Lean.Nguyen  ")).toBe("lean.nguyen");
  });

  it("resolveLoginEmail calls rpc for valid username", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "giadinh@securitytech.vn", error: null });
    const res = await resolveLoginEmail("giadinh");
    expect(res.email).toBe("giadinh@securitytech.vn");
    expect(supabase.rpc).toHaveBeenCalledWith("resolve_login_email", { _username: "giadinh" });
  });

  it("checkUsernameAvailable returns false when profile exists", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "u1" }, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(checkUsernameAvailable("taken")).resolves.toEqual({ available: false });
  });
});
