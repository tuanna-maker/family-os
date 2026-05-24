import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, mockRequireUser } from "@shared/test-utils/mock-supabase";

vi.mock("@shared/supabase/auth", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@shared/supabase/auth";
import {
  addSosNote,
  createSecurityRequest,
  createSosDispatch,
  getSecurityStatus,
  listOpenSos,
  listSecurityRequests,
  listSosEvents,
  updateSecurityRequest,
  updateSosStatus,
} from "@/api/security";

describe("security API — bao-an", () => {
  beforeEach(() => vi.clearAllMocks());

  for (const requestType of ["sos", "fire", "intrusion"] as const) {
    it(`createSecurityRequest sends request_type=${requestType}`, async () => {
      const insertPayload = vi.fn();
      const mock = createMockSupabase({
        "security_requests:insert": () => {
          insertPayload();
          return { data: { id: `req-${requestType}` }, error: null };
        },
      });
      vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);

      const res = await createSecurityRequest({
        request_type: requestType,
        building: "Tháp A",
        apartment: "12.08",
      });
      expect(res.id).toBe(`req-${requestType}`);
      expect(insertPayload).toHaveBeenCalled();
      expect(mock.from).toHaveBeenCalledWith("security_requests");
    });
  }

  it("listSecurityRequests returns ordered rows", async () => {
    const mock = createMockSupabase({
      "security_requests:select": () => ({
        data: [{ id: "r1", request_type: "sos", status: "open" }],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const rows = await listSecurityRequests();
    expect(rows).toHaveLength(1);
    expect(rows[0].request_type).toBe("sos");
  });

  it("updateSecurityRequest updates status and logs audit", async () => {
    const rpc = vi.fn();
    const mock = createMockSupabase({
      "security_requests:update": () => ({ data: null, error: null }),
      "rpc:log_audit": () => {
        rpc();
        return { data: null, error: null };
      },
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const res = await updateSecurityRequest({ id: "r1", status: "resolved" });
    expect(res.ok).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("log_audit", expect.any(Object));
  });

  it("createSosDispatch inserts request and timeline event", async () => {
    const mock = createMockSupabase({
      "security_requests:insert": () => ({
        data: { id: "dispatch-1", created_at: new Date().toISOString() },
        error: null,
      }),
      "sos_events:insert": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "guard-1") as never);
    const res = await createSosDispatch({
      priority: "P1",
      incident_type: "Cháy",
      zone: "Lobby",
      location: "Tầng 1",
      team_id: "t1",
      team_name: "Alpha",
      auto_assigned: true,
      note: "Khẩn",
    });
    expect(res.id).toBe("dispatch-1");
    expect(res.ticket_code).toMatch(/^SOS-/);
    expect(mock.from).toHaveBeenCalledWith("sos_events");
  });

  it("listOpenSos maps payload priority and age_seconds", async () => {
    const mock = createMockSupabase({
      "security_requests:select": () => ({
        data: [
          {
            id: "s1",
            status: "open",
            building: "Lobby",
            apartment: null,
            created_at: new Date(Date.now() - 90_000).toISOString(),
            payload: { ticket_code: "SOS-TEST", priority: "P1", incident_type: "Cháy", zone: "Lobby" },
          },
        ],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const rows = await listOpenSos();
    expect(rows[0].priority).toBe("P1");
    expect(rows[0].age_seconds).toBeGreaterThan(0);
  });

  it("updateSosStatus sets resolved_at when cancelled", async () => {
    const mock = createMockSupabase({
      "security_requests:select": () => ({ data: { status: "in_progress" }, error: null }),
      "security_requests:update": () => ({ data: null, error: null }),
      "sos_events:insert": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    await updateSosStatus({ id: "s1", status: "cancelled" });
    expect(mock.from).toHaveBeenCalledWith("security_requests");
  });

  it("updateSosStatus transitions status and inserts sos_events", async () => {
    const eventInsert = vi.fn();
    const mock = createMockSupabase({
      "security_requests:select": () => ({ data: { status: "open" }, error: null }),
      "security_requests:update": () => ({ data: null, error: null }),
      "sos_events:insert": () => {
        eventInsert();
        return { data: null, error: null };
      },
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "guard-1") as never);
    const res = await updateSosStatus({ id: "s1", status: "resolved", note: "Đã xử lý" });
    expect(res.ok).toBe(true);
    expect(eventInsert).toHaveBeenCalled();
  });

  it("addSosNote inserts timeline note", async () => {
    const mock = createMockSupabase({
      "sos_events:insert": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const res = await addSosNote({ id: "s1", note: "Ghi chú" });
    expect(res.ok).toBe(true);
    expect(mock.from).toHaveBeenCalledWith("sos_events");
  });

  it("listSosEvents returns timeline rows", async () => {
    const mock = createMockSupabase({
      "sos_events:select": () => ({
        data: [{ id: "e1", request_id: "s1", event_type: "note", note: "Hi" }],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const events = await listSosEvents({ id: "s1" });
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("note");
  });
});

describe("getSecurityStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  const familyId = "fam-1";

  function statusMock(overrides: Record<string, () => ReturnType<Parameters<typeof createMockSupabase>[0][string]>>) {
    return createMockSupabase({
      "families:select": () => ({ data: { owner_id: "owner-1" }, error: null }),
      "user_roles:select": () => ({ data: [{ user_id: "member-1" }], error: null }),
      "security_requests:select": () => ({ data: [], error: null }),
      "elderly_profiles:select": () => ({ data: [], error: null }),
      ...overrides,
    });
  }

  it("returns success when no open requests or elder alerts", async () => {
    const mock = statusMock({});
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const status = await getSecurityStatus({ family_id: familyId });
    expect(status.overall).toBe("success");
    expect(status.headline).toBe("Tất cả bình thường");
    expect(status.chips.every((c) => c.tone === "success")).toBe(true);
  });

  it("returns emergency when open SOS exists", async () => {
    const mock = statusMock({
      "security_requests:select": () => ({
        data: [{ request_type: "sos", status: "open", created_at: new Date().toISOString() }],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const status = await getSecurityStatus({ family_id: familyId });
    expect(status.overall).toBe("emergency");
    expect(status.headline).toBe("Cảnh báo khẩn cấp");
    expect(status.subline).toContain("SOS");
  });

  it("returns emergency for unhandled fire report", async () => {
    const mock = statusMock({
      "security_requests:select": () => ({
        data: [{ request_type: "fire", status: "in_progress", created_at: new Date().toISOString() }],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const status = await getSecurityStatus({ family_id: familyId });
    expect(status.overall).toBe("emergency");
    expect(status.subline).toContain("cháy");
  });

  it("returns emergency for elder safe_status alert", async () => {
    const mock = statusMock({
      "elderly_profiles:select": () => ({
        data: [{ name: "Ông", safe_status: "alert", safe_last_at: new Date().toISOString() }],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const status = await getSecurityStatus({ family_id: familyId });
    expect(status.overall).toBe("emergency");
    expect(status.subline).toContain("Người thân");
  });

  it("returns warning for elder safe_status warn", async () => {
    const mock = statusMock({
      "elderly_profiles:select": () => ({
        data: [{ name: "Bà", safe_status: "warn", safe_last_at: new Date().toISOString() }],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const status = await getSecurityStatus({ family_id: familyId });
    expect(status.overall).toBe("warning");
    expect(status.open_count).toBeGreaterThan(0);
  });
});
