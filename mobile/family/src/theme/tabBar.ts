import type { EdgeInsets } from "react-native-safe-area-context";

/** Chiều cao vùng icon — vừa đủ icon 18px, tránh khe trắng giữa icon và nhãn. */
export const TAB_BAR_ICON_SLOT = 22;

/** Chiều cao thanh tab — web `min-h-14` ≈ 56px. */
export const TAB_BAR_CONTENT_HEIGHT = 58;

/** Khoảng nổi dưới màn hình. */
export const TAB_BAR_FLOAT_MARGIN = 12;

/** Đẩy thanh tab lên thêm so với mép dưới điện thoại (~10–15px). */
export const TAB_BAR_BOTTOM_OFFSET = 12;

/** Nút Bảo an giữa — cùng kích thước ô icon để căn hàng. */
export const TAB_BAR_FEATURED_SIZE = 40;

/** Không dùng padding tách shell — tránh vạch trắng giữa tab bar. */
export const TAB_BAR_SHELL_PADDING_TOP = 0;

export function getTabBarBottomInset(insets: EdgeInsets): number {
  return (
    TAB_BAR_CONTENT_HEIGHT +
    TAB_BAR_FLOAT_MARGIN +
    TAB_BAR_BOTTOM_OFFSET +
    Math.max(insets.bottom, 6)
  );
}
