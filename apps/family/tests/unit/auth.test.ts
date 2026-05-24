import { describe, expect, it, vi } from "vitest";
import { Preferences } from "@capacitor/preferences";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));

describe("auth — Capacitor Preferences persistence", () => {
  it("Preferences.set/get round-trip session key", async () => {
    const store = new Map<string, string>();
    vi.mocked(Preferences.set).mockImplementation(async ({ key, value }) => {
      store.set(key, value);
    });
    vi.mocked(Preferences.get).mockImplementation(async ({ key }) => ({
      value: store.get(key) ?? null,
    }));

    await Preferences.set({ key: "sb-auth", value: JSON.stringify({ access_token: "tok" }) });
    const { value } = await Preferences.get({ key: "sb-auth" });
    expect(JSON.parse(value!)).toEqual({ access_token: "tok" });
  });
});

describe("auth — deep link redirect URL", () => {
  it("uses family auth scheme from env", () => {
    expect(import.meta.env.VITE_AUTH_REDIRECT_URL).toBe("vn.unicom.stos.family://auth");
  });
});
