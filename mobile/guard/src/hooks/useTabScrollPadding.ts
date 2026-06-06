import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarBottomInset } from "@mobile/theme/tabBar";

export function useTabScrollPadding(extra = 16) {
  const insets = useSafeAreaInsets();
  return { paddingBottom: getTabBarBottomInset(insets) + extra };
}
