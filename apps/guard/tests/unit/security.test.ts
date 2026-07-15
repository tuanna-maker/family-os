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

describe("guard — listOpenSos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns open SOS tickets with priority metadata", async () => {
    const mock = createMockSupabase({
      "security_requests:select": () => ({
        data: [
          {
            id: "r1",
            status: "open",
            building: "Lobby A",
            apartment: "12.08",
            created_at: new Date(Date.now() - 120_000).toISOString(),
            payload: {
              ticket_code: "SOS-250523-ABCD",
              priority: "P1",
              incident_type: "Cháy",
              zone: "Lobby A",
              team: { name: "Alpha" },
            },
          },
          {
            id: "r2",
            status: "in_progress",
            building: "Tháp B",
            apartment: null,
            created_at: new Date(Date.now() - 600_000).toISOString(),
            payload: { ticket_code: "SOS-250523-EFGH", priority: "P2", incident_type: "Xâm nhập" },
          },
        ],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "guard-1") as never);

    const rows = await listOpenSos();
    expect(rows).toHaveLength(2);
    expect(rows[0].priority).toBe("P1");
    expect(rows[0].age_seconds).toBeGreaterThan(0);
    expect(rows[0].team_name).toBe("Alpha");
  });

  it("throws when select returns error", async () => {
    const mock = createMockSupabase({
      "security_requests:select": () => ({ data: null, error: { message: "RLS denied" } }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    await expect(listOpenSos()).rejects.toThrow("RLS denied");
  });
});

describe("guard — createSosDispatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates ticket with SOS code", async () => {
    const mock = createMockSupabase({
      "security_requests:insert": () => ({
        data: { id: "d1", created_at: new Date().toISOString() },
        error: null,
      }),
      "sos_events:insert": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "guard-1") as never);
    const res = await createSosDispatch({
      priority: "P2",
      incident_type: "Xâm nhập",
      zone: "Cổng B",
      team_id: "t2",
      team_name: "Bravo",
      auto_assigned: false,
    });
    expect(res.ticket_code).toMatch(/^SOS-/);
  });
});

describe("guard — getSecurityStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns emergency for open SOS", async () => {
    const mock = createMockSupabase({
      "families:select": () => ({ data: { owner_id: "o1" }, error: null }),
      "user_roles:select": () => ({ data: [{ user_id: "m1" }], error: null }),
      "security_requests:select": () => ({
        data: [{ request_type: "sos", status: "open", created_at: new Date().toISOString() }],
        error: null,
      }),
      "elderly_profiles:select": () => ({ data: [], error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const status = await getSecurityStatus({ family_id: "fam-1" });
    expect(status.overall).toBe("emergency");
  });

  it("returns success when no alerts", async () => {
    const mock = createMockSupabase({
      "families:select": () => ({ data: { owner_id: "o1" }, error: null }),
      "user_roles:select": () => ({ data: [], error: null }),
      "security_requests:select": () => ({ data: [], error: null }),
      "elderly_profiles:select": () => ({ data: [], error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const status = await getSecurityStatus({ family_id: "fam-1" });
    expect(status.overall).toBe("success");
  });
});

describe("guard — SOS workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateSosStatus writes status_change event", async () => {
    const mock = createMockSupabase({
      "security_requests:select": () => ({ data: { status: "open" }, error: null }),
      "security_requests:update": () => ({ data: null, error: null }),
      "sos_events:insert": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "guard-1") as never);
    const res = await updateSosStatus({ id: "r1", status: "in_progress" });
    expect(res.ok).toBe(true);
    expect(mock.from).toHaveBeenCalledWith("sos_events");
  });

  it("addSosNote appends note event", async () => {
    const mock = createMockSupabase({
      "sos_events:insert": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock, "guard-1") as never);
    await addSosNote({ id: "r1", note: "Đã liên hệ" });
    expect(mock.from).toHaveBeenCalledWith("sos_events");
  });

  it("listSosEvents returns ordered timeline", async () => {
    const mock = createMockSupabase({
      "sos_events:select": () => ({
        data: [
          { id: "e1", request_id: "r1", event_type: "dispatched" },
          { id: "e2", request_id: "r1", event_type: "note", note: "OK" },
        ],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const events = await listSosEvents({ id: "r1" });
    expect(events).toHaveLength(2);
  });

  it("createSecurityRequest for fire type", async () => {
    const mock = createMockSupabase({
      "security_requests:insert": () => ({ data: { id: "fire-1" }, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const res = await createSecurityRequest({ request_type: "fire", building: "Tháp B" });
    expect(res.id).toBe("fire-1");
  });

  it("listSecurityRequests returns guard queue", async () => {
    const mock = createMockSupabase({
      "security_requests:select": () => ({
        data: [{ id: "q1", request_type: "intrusion", status: "open" }],
        error: null,
      }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const rows = await listSecurityRequests();
    expect(rows[0].request_type).toBe("intrusion");
  });

  it("updateSecurityRequest calls log_audit rpc", async () => {
    const mock = createMockSupabase({
      "security_requests:update": () => ({ data: null, error: null }),
      "rpc:log_audit": () => ({ data: null, error: null }),
    });
    vi.mocked(requireUser).mockResolvedValue(mockRequireUser(mock) as never);
    const res = await updateSecurityRequest({ id: "q1", status: "resolved" });
    expect(res.ok).toBe(true);
    expect(mock.rpc).toHaveBeenCalled();
  });
});

describe("guard — priority sort (pure)", () => {
  const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2, "—": 3 };

  it("sorts P1 before P2 before P3", () => {
    const rows = [
      { priority: "P3" as const, created_at: "2026-05-23T10:00:00Z" },
      { priority: "P1" as const, created_at: "2026-05-23T09:00:00Z" },
      { priority: "P2" as const, created_at: "2026-05-23T11:00:00Z" },
    ];
    rows.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    expect(rows.map((r) => r.priority)).toEqual(["P1", "P2", "P3"]);
  });
});
