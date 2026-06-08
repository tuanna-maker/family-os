import { Redirect } from "expo-router";

/** Entry route for app icon + deep link scheme root (vn.unicom.stos.familyrn:///). */
export default function Index() {
  return <Redirect href="/login" />;
}
