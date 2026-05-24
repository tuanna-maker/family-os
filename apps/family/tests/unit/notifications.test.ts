import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, mockRequireUser } from "@shared/test-utils/mock-supabase";

vi.mock("@shared/supabase/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@shared/supabase/auth";
import { listNotifications, unreadCount, markRead, markAllRead } from "@/api/notifications";

describe("notifications API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listNotifications returns paginated rows", async () => {
    const mock = createMockSupabase({
      "notifications:select": () => ({
        data: [{ id: "n1", type: "info", ref_id: null, title: "Test", body: null, due_at: null, read_at: null, created_at: "2026-05-23T00:00:00Z" }],
        error: null,
        count: 1,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    const res = await listNotifications({ limit: 10, offset: 0 });
    expect(res.rows).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it("unreadCount returns badge count", async () => {
    const mock = createMockSupabase({
      "notifications:select": () => ({ data: null, error: null, count: 5 }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    await expect(unreadCount()).resolves.toEqual({ count: 5 });
  });

  it("markRead and markAllRead succeed", async () => {
    const mock = createMockSupabase({
      "notifications:update": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    await expect(markRead({ id: "n1" })).resolves.toEqual({ ok: true });
    await expect(markAllRead()).resolves.toEqual({ ok: true });
  });
});
