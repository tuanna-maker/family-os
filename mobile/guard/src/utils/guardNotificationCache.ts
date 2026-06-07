import type { QueryClient } from "@tanstack/react-query";

export function applyGuardNotificationPref(qc: QueryClient, enabled: boolean) {
  if (!enabled) {
    qc.setQueryData(["guard-notifications-unread"], { count: 0 });
    qc.setQueryData(["guard-notifications"], []);
    void qc.cancelQueries({ queryKey: ["guard-notifications-unread"] });
    void qc.cancelQueries({ queryKey: ["guard-notifications"] });
    return;
  }
  void qc.invalidateQueries({ queryKey: ["guard-notifications-unread"] });
  void qc.invalidateQueries({ queryKey: ["guard-notifications"] });
}
