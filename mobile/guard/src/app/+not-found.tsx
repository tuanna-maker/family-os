import { Redirect } from "expo-router";

/** Fallback when a deep link or stale path has no screen. */
export default function NotFound() {
  return <Redirect href="/login" />;
}
