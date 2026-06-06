import type { EdgeInsets } from "react-native-safe-area-context";

/** Ô icon tab thường (khớp BottomNav web ~40px). */
export const TAB_BAR_ICON_SLOT = 34;

/** Chiều cao thanh tab — web `min-h-14` ≈ 56px. */
export const TAB_BAR_CONTENT_HEIGHT = 56;

/** Khoảng nổi dưới màn hình. */
export const TAB_BAR_FLOAT_MARGIN = 8;

/** Nút Bảo an giữa — web `h-12 w-12` = 48px. */
export const TAB_BAR_FEATURED_SIZE = 44;

/** Căn tâm nút giữa với icon tab thường: (featured − slot) / 2. */
export const TAB_BAR_FEATURED_LIFT = Math.round((TAB_BAR_FEATURED_SIZE - TAB_BAR_ICON_SLOT) / 2);

/** Padding trên shell — cân đối với nút giữa. */
export const TAB_BAR_SHELL_PADDING_TOP = 8;

export function getTabBarBottomInset(insets: EdgeInsets): number {
  return TAB_BAR_CONTENT_HEIGHT + TAB_BAR_FLOAT_MARGIN + Math.max(insets.bottom, 6);
}
