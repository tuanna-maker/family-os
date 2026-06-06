import type { ReactNode } from "react";

/** Stub — guard không dùng Jetpack Compose toolbar của expo-router. */
export function IconButton({ children }: { children?: ReactNode }) {
  return children ?? null;
}

export function Icon() {
  return null;
}
