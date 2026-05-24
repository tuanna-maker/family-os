import { describe, expect, it, vi } from "vitest";

vi.mock("@shared/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from "@shared/supabase/client";
import { checkUsernameAvailable, normalizeUsername, resolveLoginEmail } from "@/api/username";

describe("guard username API", () => {
  it("normalizeUsername lowercases input", () => {
    expect(normalizeUsername("  Guard.User  ")).toBe("guard.user");
  });

  it("checkUsernameAvailable returns true when free", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    await expect(checkUsernameAvailable("freeuser")).resolves.toEqual({ available: true });
  });

  it("resolveLoginEmail returns email from rpc", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "baove@securitytech.vn", error: null });
    const res = await resolveLoginEmail("baove");
    expect(res.email).toBe("baove@securitytech.vn");
  });
});
