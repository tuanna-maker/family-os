import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((opts: unknown) => { throw opts; }),
}));

vi.mock("@shared/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { supabase } from "@shared/supabase/client";
import { requireAuth } from "@/api/require-auth";

describe("guard requireAuth", () => {
  it("redirects unauthenticated users", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    await expect(requireAuth()).rejects.toMatchObject({ to: "/login" });
  });

  it("redirect includes pathname when provided", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    await expect(requireAuth({ location: { pathname: "/guard/schedule" } })).rejects.toMatchObject({
      to: "/login",
      search: { redirect: "/guard/schedule" },
    });
  });

  it("returns session when authenticated", async () => {
    const session = { user: { id: "g1" } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session }, error: null } as never);
    await expect(requireAuth()).resolves.toBe(session);
  });
});
