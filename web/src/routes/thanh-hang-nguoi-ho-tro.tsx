import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Package,
  UserCircle2,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  History,
  MapPin,
  MessageCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { requireAuth } from "@/lib/require-auth";
import {
  listMyServiceOrders,
  type ServiceOrderRow,
} from "@/lib/service-orders.functions";

export const Route = createFileRoute("/thanh-hang-nguoi-ho-tro")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({
    meta: [{ title: "Thanh hàng & Người hỗ trợ — STOS Life" }],
  }),
  component: HubPage,
});

type TabKey = "all" | "package" | "helper" | "in_progress" | "done";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "package", label: "Thanh hàng" },
  { key: "helper", label: "Người hỗ trợ" },
  { key: "in_progress", label: "Đang xử lý" },
  { key: "done", label: "Hoàn thành" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Đang chờ tiếp nhận",
  in_progress: "Đang xử lý",
  resolved: "Đã hoàn thành",
  cancelled: "Đã huỷ",
};

const STATUS_TONE: Record<string, string> = {
  open: "text-warning",
  in_progress: "text-brand",
  resolved: "text-success",
  cancelled: "text-muted-foreground",
};

function StatusIcon({ s }: { s: string }) {
  if (s === "resolved") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (s === "cancelled") return <XCircle className="h-3.5 w-3.5" />;
  if (s === "in_progress") return <Activity className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} ${dd}/${mo}`;
}

function HubPage() {
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listMyServiceOrders);
  const [tab, setTab] = useState<TabKey>("all");

  const q = useQuery({
    queryKey: ["my-service-orders"],
    queryFn: () => fetchOrders(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const orders = useMemo<ServiceOrderRow[]>(() => {
    const list = q.data ?? [];
    if (tab === "all") return list;
    if (tab === "package") return list.filter((r) => r.category === "package");
    if (tab === "helper") return list.filter((r) => r.category === "helper");
    if (tab === "in_progress")
      return list.filter((r) => r.status === "open" || r.status === "in_progress");
    if (tab === "done")
      return list.filter((r) => r.status === "resolved" || r.status === "cancelled");
    return list;
  }, [q.data, tab]);

  return (
    <MobileShell>
      <PageHeader title="Thanh hàng & Người hỗ trợ" back="/bao-an" />

      {/* Hero */}
      <section className="px-4 mt-2">
        <div className="rounded-3xl bg-gradient-to-br from-brand to-pink p-6 text-white shadow-[var(--shadow-pop)] relative overflow-hidden">
          <div className="relative z-10 max-w-[75%]">
            <p className="text-xl font-bold leading-tight">An toàn – Tiện lợi</p>
            <p className="text-sm text-white/90 mt-2 leading-relaxed">
              Nhận & gửi hàng hoá, tìm người hỗ trợ dễ dàng — cuộc sống tiện
              nghi hơn mỗi ngày.
            </p>
          </div>
          <div className="absolute right-4 bottom-4 text-6xl opacity-90">📦</div>
        </div>
      </section>

      {/* Choose service */}
      <section className="px-4 mt-6">
        <h2 className="text-[15px] font-semibold mb-3">Chọn dịch vụ</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate({ to: "/nhan-hang-ho" })}
            className="rounded-3xl bg-card border border-border p-4 text-left active:scale-[0.98] transition"
          >
            <div className="h-12 w-12 rounded-2xl bg-pink/10 grid place-items-center">
              <Package className="h-6 w-6 text-pink" />
            </div>
            <p className="mt-3 text-sm font-semibold">Thanh hàng</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Nhận & giữ hộ hàng hoá, bưu phẩm cho bạn.
            </p>
            <div className="mt-3 flex justify-end">
              <ChevronRight className="h-4 w-4 text-pink" />
            </div>
          </button>

          <button
            onClick={() => navigate({ to: "/cham-soc-tai-nha" })}
            className="rounded-3xl bg-card border border-border p-4 text-left active:scale-[0.98] transition"
          >
            <div className="h-12 w-12 rounded-2xl bg-brand/10 grid place-items-center">
              <UserCircle2 className="h-6 w-6 text-brand" />
            </div>
            <p className="mt-3 text-sm font-semibold">Người hỗ trợ</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Tìm người hỗ trợ công việc, chăm sóc tại nhà.
            </p>
            <div className="mt-3 flex justify-end">
              <ChevronRight className="h-4 w-4 text-brand" />
            </div>
          </button>
        </div>
      </section>

      {/* Orders */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold">Đơn hàng & hỗ trợ</h2>
          <button
            onClick={() => setTab("all")}
            className="text-xs font-semibold text-brand"
          >
            Xem tất cả
          </button>
        </div>

        {/* Tabs */}
        <div className="-mx-1 px-1 flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 h-9 rounded-full text-xs font-semibold transition ${
                  active
                    ? "bg-brand text-white"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl bg-card border border-border overflow-hidden">
          {q.isLoading ? (
            <div className="p-8 grid place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted grid place-items-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-semibold">Chưa có đơn nào</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Đặt dịch vụ đầu tiên để theo dõi ở đây.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orders.slice(0, 10).map((o) => (
                <li key={o.id}>
                  <div className="flex items-center gap-3 p-4">
                    <div
                      className={`h-11 w-11 rounded-2xl grid place-items-center shrink-0 ${
                        o.category === "package" ? "bg-pink/10" : "bg-brand/10"
                      }`}
                    >
                      {o.category === "package" ? (
                        <Package className="h-5 w-5 text-pink" />
                      ) : (
                        <UserCircle2 className="h-5 w-5 text-brand" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${
                          o.category === "package"
                            ? "bg-pink/10 text-pink"
                            : "bg-brand/10 text-brand"
                        }`}
                      >
                        {o.category === "package" ? "Thanh hàng" : "Người hỗ trợ"}
                      </span>
                      <p className="text-sm font-semibold truncate">{o.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {o.ticket_code && (
                          <span className="font-mono">Mã: {o.ticket_code} · </span>
                        )}
                        {fmtTime(o.created_at)}
                      </p>
                    </div>
                    <div
                      className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 ${
                        STATUS_TONE[o.status] ?? "text-muted-foreground"
                      }`}
                    >
                      <StatusIcon s={o.status} />
                      <span className="hidden xs:inline">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick utilities */}
      <section className="px-4 mt-6 mb-6">
        <h2 className="text-[15px] font-semibold mb-3">Tiện ích nhanh</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: History, label: "Lịch sử", color: "text-brand", bg: "bg-brand/10", onClick: () => setTab("done") },
            { icon: MapPin, label: "Địa chỉ", color: "text-success", bg: "bg-success/10", onClick: () => navigate({ to: "/tai-khoan" }) },
            { icon: MessageCircle, label: "Tin nhắn", color: "text-warning", bg: "bg-warning/10", onClick: () => navigate({ to: "/thong-bao" }) },
            { icon: HelpCircle, label: "Hướng dẫn", color: "text-pink", bg: "bg-pink/10", onClick: () => navigate({ to: "/bao-an" }) },
          ].map((u, i) => {
            const Icon = u.icon;
            return (
              <button
                key={i}
                onClick={u.onClick}
                className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-2 active:scale-[0.98] transition"
              >
                <div className={`h-10 w-10 rounded-xl grid place-items-center ${u.bg}`}>
                  <Icon className={`h-5 w-5 ${u.color}`} />
                </div>
                <span className="text-[11px] font-semibold text-center leading-tight">
                  {u.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </MobileShell>
  );
}
