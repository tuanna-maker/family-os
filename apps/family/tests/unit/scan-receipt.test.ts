import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, mockRequireUser } from "@shared/test-utils/mock-supabase";

vi.mock("@shared/supabase/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@shared/supabase/auth";
import { scanReceipt } from "@/api/scan-receipt";

const FAMILY_ID = "11111111-1111-1111-1111-111111111111";
const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("scan-receipt API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns parsed OCR result from edge function", async () => {
    const mock = createMockSupabase({});
    mock.invoke.mockResolvedValue({
      data: {
        ok: true,
        result: {
          scan_id: "scan-1",
          merchant: "Big C",
          total: 250000,
          date: "2026-05-23",
          category: "Ăn uống",
          note: "",
          line_items: [{ name: "Sữa", qty: 2, price: 50000 }],
        },
      },
      error: null,
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    const res = await scanReceipt({ family_id: FAMILY_ID, imageDataUrl: IMG });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.merchant).toBe("Big C");
      expect(res.result.line_items).toHaveLength(1);
    }
    expect(mock.invoke).toHaveBeenCalledWith("scan-receipt", expect.any(Object));
  });

  it("returns error when edge function fails", async () => {
    const mock = createMockSupabase({});
    mock.invoke.mockResolvedValue({ data: null, error: { message: "AI timeout" } });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    const res = await scanReceipt({ family_id: FAMILY_ID, imageDataUrl: IMG });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("timeout");
  });
});
