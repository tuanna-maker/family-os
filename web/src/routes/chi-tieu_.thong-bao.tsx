import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, RefreshCw, Loader2, CheckCheck, AlertTriangle, Clock } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  listExpenseNotifications,
  runExpenseChecks,
  markNotificationRead,
  markAllExpenseNotificationsRead,
} from "@/lib/expense-notifications.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/chi-tieu_/thong-bao")({
  head: () => ({ meta: [{ title: "Thông báo chi tiêu — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: NotifPage,
});

function typeMeta(type: string) {
  if (type === "expense_budget_over")
    return { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-emergency/15 text-emergency", label: "Vượt ngân sách" };
  if (type === "expense_budget_warn")
    return { icon: <BellRing className="h-4 w-4" />, color: "bg-amber-100 text-amber-700", label: "Cảnh báo ngân sách" };
  if (type === "expense_recurring_due")
    return { icon: <Clock className="h-4 w-4" />, color: "bg-brand/15 text-brand", label: "Sắp đến hạn" };
  return { icon: <Bell className="h-4 w-4" />, color: "bg-muted text-foreground", label: "Thông báo" };
}

function NotifPage() {
  const getCtx = useServerFn(getMyContext);
  const loadList = useServerFn(listExpenseNotifications);
  const runChecks = useServerFn(runExpenseChecks);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllExpenseNotificationsRead);
  const qc = useQueryClient();

  const ctxQ = useQuery({ queryKey: ["my-ctx"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const familyId = ctxQ.data?.family?.id ?? null;

  const listQ = useQuery({
    queryKey: ["expense-notifs", familyId],
    queryFn: () => loadList({ data: familyId ? { family_id: familyId } : {} }),
    enabled: !!ctxQ.data,
    staleTime: 30_000,
  });

  const checkMut = useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error("Chưa có gia đình active");
      return runChecks({ data: { family_id: familyId } });
    },
    onSuccess: (r) => {
      toast.success(`Đã quét: ${r.budgetAlerts} cảnh báo ngân sách, ${r.recurringAlerts} nhắc định kỳ`);
      qc.invalidateQueries({ queryKey: ["expense-notifs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-notifs"] }),
  });

  const readAllMut = useMutation({
    mutationFn: () => markAll({ data: familyId ? { family_id: familyId } : {} }),
    onSuccess: () => {
      toast.success("Đã đánh dấu đã đọc");
      qc.invalidateQueries({ queryKey: ["expense-notifs"] });
    },
  });

  const notifs = listQ.data?.notifications ?? [];
  const unread = notifs.filter((n) => !n.read_at);

  return (
    <MobileShell>
      <PageHeader title="Thông báo chi tiêu" back="/chi-tieu" />

      <section className="px-4 mt-4 space-y-3">
        <RoundedCard className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-brand/15 text-brand grid place-items-center shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{unread.length} thông báo chưa đọc</p>
            <p className="text-[11px] text-muted-foreground">
              Tổng {notifs.length} thông báo gần đây
            </p>
          </div>
          <button
            onClick={() => checkMut.mutate()}
            disabled={checkMut.isPending || !familyId}
            className="h-9 px-3 rounded-2xl bg-brand text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {checkMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Quét ngay
          </button>
        </RoundedCard>

        {unread.length > 0 && (
          <button
            onClick={() => readAllMut.mutate()}
            disabled={readAllMut.isPending}
            className="w-full h-10 rounded-2xl border border-border text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </section>

      <section className="px-4 mt-5 pb-32">
        <SectionHeader title="Danh sách" />
        <RoundedCard className="p-0 divide-y divide-border">
          {listQ.isLoading && (
            <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </div>
          )}
          {!listQ.isLoading && notifs.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào. Nhấn "Quét ngay" để kiểm tra ngân sách & khoản định kỳ sắp tới.
            </div>
          )}
          {notifs.map((n) => {
            const meta = typeMeta(n.type);
            return (
              <button
                key={n.id}
                onClick={() => !n.read_at && readMut.mutate(n.id)}
                className={`w-full text-left flex items-start gap-3 p-4 ${!n.read_at ? "bg-tint-blue/30" : ""}`}
              >
                <div className={`h-9 w-9 rounded-2xl grid place-items-center shrink-0 ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{n.title}</p>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-brand shrink-0" />}
                  </div>
                  {n.body && <p className="text-[11px] text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {meta.label} • {new Date(n.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              </button>
            );
          })}
        </RoundedCard>
      </section>
    </MobileShell>
  );
}
