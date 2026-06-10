/** Kính mờ tab bar — đủ đục để chữ phía sau không chồng lên icon. */
export function tabBarGlassColors(isDark: boolean) {
  return {
    /** Lớp trên thanh pill */
    shellOverlay: isDark ? "rgba(16, 20, 28, 0.92)" : "rgba(255, 255, 255, 0.94)",
    frostOverlay: isDark ? "rgba(8, 11, 18, 0.35)" : "rgba(255, 255, 255, 0.3)",
    border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
  };
}
