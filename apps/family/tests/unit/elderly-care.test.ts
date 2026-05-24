import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, mockRequireUser } from "@shared/test-utils/mock-supabase";

vi.mock("@shared/supabase/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@shared/supabase/auth";
import { listMedicineReminders, markMedicineTaken } from "@/api/elderly-care";

describe("elderly-care API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listMedicineReminders returns active schedule", async () => {
    const mock = createMockSupabase({
      "medicine_logs:select": () => ({ data: [], error: null }),
      "medicine_reminders:select": () => ({
        data: [
          {
            id: "m1",
            elderly_id: "e1",
            name: "Aspirin",
            time_of_day: "08:00",
            active: true,
            days_of_week: [1, 2, 3, 4, 5],
          },
        ],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    const rows = await listMedicineReminders({ family_id: "f1", elderly_id: "e1" });
    expect(rows[0].name).toBe("Aspirin");
    expect(rows[0].time_of_day).toBe("08:00");
  });

  it("markMedicineTaken records dose log", async () => {
    const mock = createMockSupabase({
      "medicine_logs:insert": () => ({ data: { id: "d1" }, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

    await expect(
      markMedicineTaken({ reminder_id: "m1", family_id: "f1" }),
    ).resolves.toEqual({ ok: true });
  });
});
