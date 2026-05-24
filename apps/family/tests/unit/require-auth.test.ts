import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn((opts: unknown) => {
    throw opts;
  }),
}));

vi.mock("@shared/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from "@shared/supabase/client";
import { requireAuth } from "@/api/require-auth";

describe("requireAuth route guard", () => {
  it("redirects to /login when no session", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    await expect(requireAuth({ location: { pathname: "/home" } })).rejects.toMatchObject({
      to: "/login",
    });
  });

  it("returns session when authenticated", async () => {
    const session = { access_token: "abc" };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session }, error: null } as never);
    await expect(requireAuth()).resolves.toEqual(session);
  });
});
