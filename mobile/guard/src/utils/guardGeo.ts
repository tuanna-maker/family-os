import * as Location from "expo-location";

export type GuardCoords = {
  lat: number;
  lng: number;
  accuracy?: number;
};

const GEO_TIMEOUT_MS = 10_000;

export async function resolveGuardLocation(): Promise<{
  coords: GuardCoords | null;
  error: string | null;
}> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return { coords: null, error: "Cần quyền truy cập vị trí." };
  }

  try {
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), GEO_TIMEOUT_MS),
      ),
    ]);
    return {
      coords: {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      },
      error: null,
    };
  } catch {
    return {
      coords: null,
      error: "Không lấy được vị trí — vẫn có thể tiếp tục không GPS.",
    };
  }
}

export function invalidateShiftQueries(qc: { invalidateQueries: (o: { queryKey: string[] }) => void }) {
  qc.invalidateQueries({ queryKey: ["guard-active-shift"] });
  qc.invalidateQueries({ queryKey: ["guard-my-shifts"] });
}
