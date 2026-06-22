import type { EdgeInsets } from "react-native-safe-area-context";

/** Chiều cao vùng icon — vừa đủ icon 18px, tránh khe trắng giữa icon và nhãn. */
export const TAB_BAR_ICON_SLOT = 22;

/** Chiều cao thanh tab — web `min-h-14` ≈ 56px. */
export const TAB_BAR_CONTENT_HEIGHT = 58;

/** Vùng gradient mờ phía trên thanh tab (GlassTabBar frostZone). */
export const TAB_BAR_FROST_EXTRA = 72;

/** Khoảng cách mép dưới thanh tab tới safe area (~10–12px). */
export const TAB_BAR_BOTTOM_OFFSET = 10;

/** Nút Bảo an giữa — cùng kích thước ô icon để căn hàng. */
export const TAB_BAR_FEATURED_SIZE = 40;

/** Không dùng padding tách shell — tránh vạch trắng giữa tab bar. */
export const TAB_BAR_SHELL_PADDING_TOP = 0;

export function getTabBarBottomInset(insets: EdgeInsets): number {
  return TAB_BAR_CONTENT_HEIGHT + TAB_BAR_BOTTOM_OFFSET + TAB_BAR_FROST_EXTRA + insets.bottom;
}
