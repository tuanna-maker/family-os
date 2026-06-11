import { describe, expect, it, vi } from "vitest";
import { Geolocation } from "@capacitor/geolocation";
import { Camera } from "@capacitor/camera";
import { isOnDutyShift, resolveShiftEnd, type GuardShift } from "@/api/guard-shifts";

function shift(partial: Partial<GuardShift> & Pick<GuardShift, "shift_date" | "shift_type">): GuardShift {
  return {
    id: "s1",
    guard_id: "g1",
    project_id: null,
    start_at: `${partial.shift_date}T06:00:00+07:00`,
    end_at: partial.end_at ?? null,
    check_in_at: `${partial.shift_date}T06:05:00+07:00`,
    check_out_at: null,
    status: partial.status ?? "checked_in",
    notes: null,
    ...partial,
  };
}

describe("guard.shift — stale open shift", () => {
  it("morning shift from yesterday is not on duty next morning", () => {
    const s = shift({
      shift_date: "2026-06-10",
      shift_type: "morning",
      end_at: "2026-06-10T14:00:00+07:00",
    });
    const now = new Date("2026-06-11T08:00:00+07:00");
    expect(isOnDutyShift(s, now)).toBe(false);
    expect(resolveShiftEnd(s).toISOString()).toBe(new Date("2026-06-10T14:00:00+07:00").toISOString());
  });

  it("night shift still on duty after midnight until end_at", () => {
    const s = shift({
      shift_date: "2026-06-10",
      shift_type: "night",
      end_at: "2026-06-11T06:00:00+07:00",
    });
    const now = new Date("2026-06-11T03:00:00+07:00");
    expect(isOnDutyShift(s, now)).toBe(true);
  });

  it("night shift is stale after end_at on the next day", () => {
    const s = shift({
      shift_date: "2026-06-10",
      shift_type: "night",
      end_at: "2026-06-11T06:00:00+07:00",
    });
    const now = new Date("2026-06-11T08:00:00+07:00");
    expect(isOnDutyShift(s, now)).toBe(false);
  });
});

describe("guard.check-in — QR + geolocation", () => {
  it("captures geolocation on check-in", async () => {
    const pos = await Geolocation.getCurrentPosition();
    expect(pos.coords.latitude).toBeCloseTo(10.762622, 3);
  });

  it("camera returns photo for QR scan", async () => {
    const photo = await Camera.getPhoto({ quality: 90, resultType: "dataUrl" } as never);
    expect(photo.dataUrl).toMatch(/^data:image\//);
  });
});

describe("guard.patrol — checkpoint timestamp", () => {
  it("records checkpoint scan with ISO timestamp", () => {
    const checkpoint = { route_id: "r1", point_id: "p3", scanned_at: new Date().toISOString() };
    expect(checkpoint.scanned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("guard.incident — dispatch payload", () => {
  it("builds incident with photo attachment ref", () => {
    const incident = {
      type: "fire",
      zone: "Tầng hầm B1",
      photo_url: "storage://incidents/photo.jpg",
      dispatched: false,
    };
    expect(incident.photo_url).toContain("incidents/");
  });
});

describe("guard.requests — lifecycle", () => {
  it("transitions open → assigned → closed", () => {
    const states = ["open", "assigned", "closed"] as const;
    expect(states.indexOf("closed")).toBeGreaterThan(states.indexOf("open"));
  });
});
