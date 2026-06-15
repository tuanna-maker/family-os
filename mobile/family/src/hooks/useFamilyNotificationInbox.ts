import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteReadNotifications,
  listNotifications,
  markAllRead,
  markRead,
  type NotificationRow,
} from "@mobile/api/notifications";

type NotificationList = Awaited<ReturnType<typeof listNotifications>>;

function syncUnreadFromList(qc: ReturnType<typeof useQueryClient>, rows: NotificationRow[]) {
  const count = rows.filter((r) => !r.read_at).length;
  qc.setQueryData(["notifications-unread"], { count });
}

/** Cập nhật cache inbox + badge — không refetch (giống Guard). */
export function patchFamilyNotificationRow(
  qc: ReturnType<typeof useQueryClient>,
  row: Partial<NotificationRow> & { id: string },
) {
  qc.setQueryData<NotificationList>(["notifications-all"], (old) => {
    if (!old) return old;
    if (row.dismissed_at) {
      const rows = old.rows.filter((r) => r.id !== row.id);
      syncUnreadFromList(qc, rows);
      return { ...old, rows, total: Math.max(0, old.total - 1) };
    }
    const rows = old.rows.map((r) => (r.id === row.id ? { ...r, ...row } : r));
    syncUnreadFromList(qc, rows);
    return { ...old, rows };
  });
}

export function useFamilyNotificationInbox() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications-all"],
    queryFn: () => listNotifications({ limit: 50, offset: 0 }),
    staleTime: 60_000,
  });

  const rows = q.data?.rows ?? [];
  const unread = rows.filter((item) => !item.read_at).length;
  const readCount = rows.filter((item) => item.read_at).length;

  const markOne = useMutation({
    mutationFn: markRead,
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["notifications-all"] });
      const prev = qc.getQueryData<NotificationList>(["notifications-all"]);
      const now = new Date().toISOString();
      if (prev) {
        const rows = prev.rows.map((r) => (r.id === id ? { ...r, read_at: now } : r));
        qc.setQueryData<NotificationList>(["notifications-all"], { ...prev, rows });
        syncUnreadFromList(qc, rows);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications-all"], ctx.prev);
      void qc.invalidateQueries({ queryKey: ["notifications-all"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAll = useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications-all"] });
      const prev = qc.getQueryData<NotificationList>(["notifications-all"]);
      const now = new Date().toISOString();
      if (prev) {
        const rows = prev.rows.map((r) => (r.read_at ? r : { ...r, read_at: now }));
        qc.setQueryData<NotificationList>(["notifications-all"], { ...prev, rows });
        qc.setQueryData(["notifications-unread"], { count: 0 });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications-all"], ctx.prev);
      void qc.invalidateQueries({ queryKey: ["notifications-all"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const deleteRead = useMutation({
    mutationFn: deleteReadNotifications,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications-all"] });
      const prev = qc.getQueryData<NotificationList>(["notifications-all"]);
      if (prev) {
        const rows = prev.rows.filter((r) => !r.read_at);
        qc.setQueryData<NotificationList>(["notifications-all"], {
          ...prev,
          rows,
          total: rows.length,
        });
        syncUnreadFromList(qc, rows);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications-all"], ctx.prev);
      void qc.invalidateQueries({ queryKey: ["notifications-all"] });
      void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markOneFast = useCallback(
    (id: string) => {
      if (!id) return;
      const cached = qc.getQueryData<NotificationList>(["notifications-all"]);
      const row = cached?.rows.find((r) => r.id === id);
      if (row?.read_at) return;
      markOne.mutate({ id });
    },
    [markOne, qc],
  );

  return {
    q,
    rows,
    unread,
    readCount,
    markOne,
    markOneFast,
    markAll,
    deleteRead,
  };
}
