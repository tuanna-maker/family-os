import type { QueryClient } from "@tanstack/react-query";

export function applyGuardNotificationPref(qc: QueryClient, enabled: boolean) {
  void qc.invalidateQueries({ queryKey: ["guard-notifications-unread"] });
  void qc.invalidateQueries({ queryKey: ["guard-notifications"] });
  void qc.invalidateQueries({ queryKey: ["guard-open-requests"] });
  if (enabled) return;
  // Chỉ tắt push hệ thống — vẫn hiển thị yêu cầu & thông báo trong app.
}
