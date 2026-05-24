import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, mockRequireUser } from "@shared/test-utils/mock-supabase";

vi.mock("@shared/supabase/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@shared/supabase/auth";
import { getMyPrefs, listFamilyPrefs, updateMyPrefs } from "@/api/notification-prefs";

describe("notification-prefs — quiet hours", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getMyPrefs returns defaults when no row", async () => {
    const mock = createMockSupabase({
      "notification_preferences:select": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "u1") as never);

    const prefs = await getMyPrefs();
    expect(prefs.quiet_start).toBe("07:00");
    expect(prefs.quiet_end).toBe("22:00");
    expect(prefs.medicine_enabled).toBe(true);
  });

  it("listFamilyPrefs returns members with defaults", async () => {
    const mock = createMockSupabase({
      "families:select": () => ({ data: { id: "fam-1", owner_id: "o1" }, error: null }),
      "user_roles:select": () => ({ data: [{ user_id: "m1" }], error: null }),
      "profiles:select": () => ({ data: [{ id: "o1", full_name: "Chủ hộ" }, { id: "m1", full_name: "Thành viên" }], error: null }),
      "notification_preferences:select": () => ({ data: [], error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "o1") as never);
    const { members } = await listFamilyPrefs();
    expect(members.length).toBeGreaterThan(0);
    expect(members[0].prefs.quiet_start).toBe("07:00");
  });

  it("listFamilyPrefs returns empty when user has no family", async () => {
    const mock = createMockSupabase({
      "families:select": () => ({ data: null, error: null }),
      "user_roles:select": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "orphan") as never);
    const { members } = await listFamilyPrefs();
    expect(members).toEqual([]);
  });

  it("updateMyPrefs upserts quiet hours", async () => {
    const mock = createMockSupabase({
      "notification_preferences:upsert": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "u1") as never);

    await expect(
      updateMyPrefs({ quiet_start: "22:00", quiet_end: "06:00", medicine_enabled: false }),
    ).resolves.toEqual({ ok: true });
  });
});
