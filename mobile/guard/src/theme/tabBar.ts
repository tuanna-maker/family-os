import type { EdgeInsets } from "react-native-safe-area-context";

export const TAB_BAR_ICON_SLOT = 30;
export const TAB_BAR_ICON_SIZE = 22;
export const TAB_BAR_CONTENT_HEIGHT = 46;
export const TAB_BAR_FLOAT_MARGIN = 10;
export const TAB_BAR_BOTTOM_OFFSET = 10;
export const TAB_BAR_SHELL_PADDING_TOP = 0;

export function getTabBarBottomInset(insets: EdgeInsets): number {
  return (
    TAB_BAR_CONTENT_HEIGHT +
    TAB_BAR_FLOAT_MARGIN +
    TAB_BAR_BOTTOM_OFFSET +
    Math.max(insets.bottom, 6)
  );
}
