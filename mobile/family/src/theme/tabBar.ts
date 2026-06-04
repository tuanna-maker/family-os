import type { EdgeInsets } from "react-native-safe-area-context";

/** Chiều cao nội dung tab (không gồm safe area). */
export const TAB_BAR_CONTENT_HEIGHT = 64;

/** Khoảng cách nổi phía dưới (giống BottomNav web). */
export const TAB_BAR_FLOAT_MARGIN = 10;

/** Chiều cao nút Bảo an nổi (center). */
export const TAB_BAR_FEATURED_SIZE = 52;

export function getTabBarBottomInset(insets: EdgeInsets): number {
  return TAB_BAR_CONTENT_HEIGHT + TAB_BAR_FLOAT_MARGIN + Math.max(insets.bottom, 8);
}
