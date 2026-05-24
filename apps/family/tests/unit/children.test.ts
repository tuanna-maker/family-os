import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, mockRequireUser } from "@shared/test-utils/mock-supabase";

vi.mock("@shared/supabase/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@shared/supabase/auth";
import { listChildren, toggleHomework } from "@/api/children";

describe("con-cai API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listChildren returns family children", async () => {
    const mock = createMockSupabase({
      "children:select": () => ({
        data: [{ id: "c1", name: "Minh", grade: "Lớp 3", avatar_url: null }],
        error: null,
      }),
      "school_schedules:select": () => ({ data: [], error: null }),
      "homeworks:select": () => ({ data: [], error: null }),
      "achievements:select": () => ({ data: [], error: null }),
      "parent_reminders:select": () => ({ data: [], error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    const res = await listChildren({ family_id: "f1" });
    expect(res.children[0].name).toBe("Minh");
  });

  it("toggleHomework flips completion flag", async () => {
    const mock = createMockSupabase({
      "homeworks:update": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    await expect(toggleHomework({ id: "hw1", done: true })).resolves.toEqual({ ok: true });
  });
});
