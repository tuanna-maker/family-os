import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pill, Bell, Check, CheckCheck, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, ErrorState, EmptyState } from "@shared/ui/common/States";
import {
  listNotifications,
  markRead,
  markAllRead,
  type NotificationRow,
} from "@/api/notifications";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@shared/utils";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/thong-bao")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Thông báo gia đình" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  useNotifications(); // wire realtime
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;
        const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications", { onlyUnread, page }],
    queryFn: () => listNotifications({ only_unread: onlyUnread, limit: pageSize, offset: page * pageSize }),
  });

  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const markOne = useMutation({
    mutationFn: (id: string) => markRead({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Trung tâm
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/cai-dat/thong-bao"
            className="text-xs font-semibold text-muted-foreground flex items-center gap-1"
          >
            <Settings className="h-4 w-4" /> Cài đặt
          </Link>
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-xs font-semibold text-brand flex items-center gap-1"
          >
            <CheckCheck className="h-4 w-4" /> Đánh dấu đã đọc
          </button>
        </div>
      </header>

      <div className="px-4 mb-3 flex gap-2">
        <FilterChip active={!onlyUnread} onClick={() => { setOnlyUnread(false); setPage(0); }}>
          Tất cả
        </FilterChip>
        <FilterChip active={onlyUnread} onClick={() => { setOnlyUnread(true); setPage(0); }}>
          Chưa đọc
        </FilterChip>
      </div>

      <section className="px-4 pb-6">
        <SectionHeader title={`${total} thông báo`} />
        {q.isLoading && <LoadingState />}
        {q.error && <ErrorState message={(q.error as Error).message} />}
        {q.data && q.data.rows.length === 0 && (
          <EmptyState title="Chưa có thông báo" description="Nhắc nhở sẽ xuất hiện ở đây khi đến hạn." />
        )}
        {q.data && q.data.rows.length > 0 && (
          <>
            <RoundedCard className="p-0 overflow-hidden">
              <ul className="divide-y divide-border">
                {q.data.rows.map((n) => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    onRead={() => markOne.mutate(n.id)}
                    pending={markOne.isPending && markOne.variables === n.id}
                  />
                ))}
              </ul>
            </RoundedCard>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Trang {page + 1} / {totalPages} · {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, total)} của {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || q.isFetching}
                  className="h-9 w-9 rounded-xl bg-card border border-border grid place-items-center disabled:opacity-40"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || q.isFetching}
                  className="h-9 w-9 rounded-xl bg-card border border-border grid place-items-center disabled:opacity-40"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </MobileShell>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-xs font-semibold border transition",
        active ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border",
      )}
    >
      {children}
    </button>
  );
}

function NotifRow({
  n,
  onRead,
  pending,
}: {
  n: NotificationRow;
  onRead: () => void;
  pending: boolean;
}) {
  const unread = !n.read_at;
  const Icon = n.type === "medicine" ? Pill : Bell;
  const tone = n.type === "medicine" ? "text-emergency bg-tint-red" : "text-pink bg-tint-pink";

  return (
    <li className={cn("flex items-start gap-3 px-4 py-3", unread && "bg-tint-blue/40")}>
      <div className={cn("h-9 w-9 rounded-2xl grid place-items-center shrink-0", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{n.title}</p>
        {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">
          {new Date(n.created_at).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {n.read_at && " · đã đọc"}
        </p>
      </div>
      {unread && (
        <button
          onClick={onRead}
          disabled={pending}
          className="h-8 w-8 rounded-xl bg-card border border-border grid place-items-center text-brand"
          aria-label="Đánh dấu đã đọc"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
