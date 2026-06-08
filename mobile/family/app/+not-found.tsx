import { Redirect } from "expo-router";

/** Fallback when a deep link or stale path has no screen — avoid Unmatched Route screen. */
export default function NotFound() {
  return <Redirect href="/login" />;
}
