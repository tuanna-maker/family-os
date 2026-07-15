import { vi } from "vitest";

export function setupCapacitorMocks() {
  vi.mock("@capacitor/preferences", () => ({
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({ value: null })),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
  }));

  vi.mock("@capacitor/camera", () => ({
    Camera: {
      getPhoto: vi.fn(async () => ({
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        format: "png",
      })),
    },
  }));

  vi.mock("@capacitor/geolocation", () => ({
    Geolocation: {
      getCurrentPosition: vi.fn(async () => ({
        coords: { latitude: 10.762622, longitude: 106.660172, accuracy: 5 },
        timestamp: Date.now(),
      })),
    },
  }));

  vi.mock("@capacitor/push-notifications", () => ({
    PushNotifications: {
      requestPermissions: vi.fn(async () => ({ receive: "granted" })),
      register: vi.fn(async () => undefined),
      addListener: vi.fn(() => ({ remove: vi.fn() })),
    },
  }));

  vi.mock("@capacitor/app", () => ({
    App: {
      addListener: vi.fn(() => ({ remove: vi.fn() })),
      getLaunchUrl: vi.fn(async () => ({ url: null })),
    },
  }));
}
