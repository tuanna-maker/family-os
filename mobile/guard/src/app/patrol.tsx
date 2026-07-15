import { Redirect } from "expo-router";

/** Deep link cũ → tab Tuần tra */
export default function PatrolRedirect() {
  return <Redirect href="/(tabs)/patrol" />;
}
