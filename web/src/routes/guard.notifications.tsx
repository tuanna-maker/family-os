import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { listNotifications, markAllRead, markRead, type NotificationRow } from "@/lib/notifications.functions";

export const Route = createFileRoute("/guard/notifications")({
  head: () => ({ meta: [{ title: "Thông báo — Bảo vệ" }] }),
  component: GuardNotifications,
});

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

function toneFor(n: NotificationRow) {
  if (n.type.startsWith("sos") || n.type.includes("emergency"))
    return "bg-emergency/10 text-emergency";
  if (n.type.includes("request") || n.type.includes("resident"))
    return "bg-brand/10 text-brand";
  if (n.type.includes("shift") || n.type.includes("approved"))
    return "bg-success/10 text-success";
  if (n.type.includes("warn") || n.type.includes("alert"))
    return "bg-warning/10 text-warning";
  return "bg-muted text-foreground";
}

function GuardNotifications() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listNotifications);
  const markOne = useServerFn(markRead);
  const markAll = useServerFn(markAllRead);
  const q = useQuery({
    queryKey: ["guard-notifications"],
    queryFn: () => fetchFn({ data: { limit: 50 } }),
    refetchInterval: 30000,
  });
  const rows = q.data?.rows ?? [];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <>
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Thông báo {unread > 0 && <span className="text-xs text-emergency font-semibold">({unread})</span>}
        </h1>
        {unread > 0 && (
          <button
            onClick={async () => {
              await markAll();
              qc.invalidateQueries({ queryKey: ["guard-notifications"] });
            }}
            className="text-xs text-brand font-semibold"
          >
            Đánh dấu đã đọc
          </button>
        )}
      </header>
      {q.isLoading ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Chưa có thông báo</p>
      ) : (
        <section className="px-5 space-y-2">
          {rows.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.read_at) {
                  await markOne({ data: { id: n.id } });
                  qc.invalidateQueries({ queryKey: ["guard-notifications"] });
                }
              }}
              className={`w-full text-left rounded-2xl border p-4 flex gap-3 transition ${
                n.read_at ? "bg-card border-border" : "bg-card border-brand/40"
              }`}
            >
              <div className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${toneFor(n)}`}>
                {n.read_at ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="text-[12px] text-muted-foreground line-clamp-2">{n.body}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="h-2 w-2 rounded-full bg-emergency mt-2 shrink-0" />}
            </button>
          ))}
        </section>
      )}
    </>
  );
}
