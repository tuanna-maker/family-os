/** Kiểu kính mờ Telegram — trong suốt, thấy nội dung phía sau. */
export function tabBarGlassColors(isDark: boolean) {
  return {
    overlay: isDark ? "rgba(22, 27, 34, 0.55)" : "rgba(255, 255, 255, 0.28)",
    /** Android: mờ trong suốt — không dùng elevation (gây vạch sáng). */
    androidSolid: isDark ? "rgba(22, 27, 34, 0.62)" : "rgba(255, 255, 255, 0.38)",
    border: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.45)",
  };
}
