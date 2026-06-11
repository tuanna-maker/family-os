import { Redirect } from "expo-router";

/** Entry for app icon + deep link scheme root (vn.unicom.stos.guardrn:///). */
export default function Index() {
  return <Redirect href="/login" />;
}
