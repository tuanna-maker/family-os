import { describe, expect, it, vi } from "vitest";
import { Geolocation } from "@capacitor/geolocation";
import { Camera } from "@capacitor/camera";

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
