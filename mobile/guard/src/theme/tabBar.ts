import type { EdgeInsets } from "react-native-safe-area-context";

/** Chiều cao vùng icon — vừa đủ icon 18px, tránh khe trắng giữa icon và nhãn. */
export const TAB_BAR_ICON_SLOT = 22;

export const TAB_BAR_ICON_SIZE = 18;

/** Chiều cao hàng tab (web min-h-14 ≈ 56px). */
export const TAB_BAR_CONTENT_HEIGHT = 58;

export const TAB_BAR_FLOAT_MARGIN = 12;

export const TAB_BAR_BOTTOM_OFFSET = 12;

export const TAB_BAR_SHELL_PADDING_TOP = 0;

export function getTabBarBottomInset(insets: EdgeInsets): number {
  return (
    TAB_BAR_CONTENT_HEIGHT +
    TAB_BAR_FLOAT_MARGIN +
    TAB_BAR_BOTTOM_OFFSET +
    Math.max(insets.bottom, 6)
  );
}
