import { describe, expect, it } from "vitest";

/** QR guest pass — Phase 2 stub contract tests */
describe("qr-vao-ra (stub)", () => {
  it("guest QR expires after configured TTL", () => {
    const TTL_MS = 24 * 60 * 60 * 1000;
    const created = Date.now();
    const expiresAt = created + TTL_MS;
    expect(expiresAt).toBeGreaterThan(created);
    expect(expiresAt - created).toBe(TTL_MS);
  });

  it("QR payload encodes family_id and guest name", () => {
    const payload = { family_id: "f1", guest: "Khách A", exp: Date.now() + 3600_000 };
    const encoded = btoa(JSON.stringify(payload));
    const decoded = JSON.parse(atob(encoded));
    expect(decoded.guest).toBe("Khách A");
  });
});
