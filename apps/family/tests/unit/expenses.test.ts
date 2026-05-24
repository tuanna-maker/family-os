import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, mockRequireUser } from "@shared/test-utils/mock-supabase";

vi.mock("@shared/supabase/auth", () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from "@shared/supabase/auth";
import { listExpenses, createExpense, deleteExpense } from "@/api/expenses";

const FAMILY_ID = "11111111-1111-1111-1111-111111111111";

describe("expenses API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listExpenses merges manual expenses and unscanned receipts", async () => {
    const mock = createMockSupabase({
      "expenses:select": () => ({
        data: [
          {
            id: "e1",
            title: "Đi chợ",
            category: "Ăn uống",
            amount: 150000,
            spent_on: "2026-05-01",
            note: null,
            created_at: "2026-05-01T10:00:00Z",
          },
        ],
        error: null,
      }),
      "receipt_scans:select": () => ({
        data: [
          {
            id: "s1",
            merchant: "WinMart",
            category: "Nhà cửa",
            total: 89000,
            scanned_date: "2026-05-02",
            created_at: "2026-05-02T08:00:00Z",
            expense_id: null,
          },
        ],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    const rows = await listExpenses({ family_id: FAMILY_ID });
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.source === "manual")).toBe(true);
    expect(rows.some((r) => r.source === "scan")).toBe(true);
  });

  it("createExpense returns new id", async () => {
    const mock = createMockSupabase({
      "expenses:insert": () => ({ data: { id: "new-exp" }, error: null }),
      "receipt_scans:update": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    const res = await createExpense({
      family_id: FAMILY_ID,
      title: "Cafe",
      category: "Ăn uống",
      amount: 45000,
      spent_on: "2026-05-23",
    });
    expect(res.id).toBe("new-exp");
  });

  it("deleteExpense succeeds", async () => {
    const mock = createMockSupabase({
      "expenses:delete": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    await expect(deleteExpense({ id: "e1" })).resolves.toEqual({ ok: true });
  });
});
