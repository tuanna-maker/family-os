import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ArrowRight, Users, Wallet } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { formatVND } from "@/features/shared";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import { getSettlement, exportExpensesCsv } from "@/lib/expense-settlement.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/chi-tieu_/quyet-toan")({
  head: () => ({ meta: [{ title: "Quyết toán gia đình — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: SettlementPage,
});

function SettlementPage() {
  const getCtx = useServerFn(getMyContext);
  const loadSettle = useServerFn(getSettlement);
  const exportCsv = useServerFn(exportExpensesCsv);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx() });
  const familyId = ctxQ.data?.family?.id;

  const settleQ = useQuery({
    queryKey: ["settlement", familyId],
    queryFn: () => loadSettle({ data: { familyId: familyId! } }),
    enabled: !!familyId,
  });

  const handleExport = async () => {
    if (!familyId) return;
    try {
      const r = await exportCsv({ data: { familyId } });
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const m = new Date();
      a.href = url;
      a.download = `chi-tieu-${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất ${r.count} giao dịch`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const s = settleQ.data;

  return (
    <MobileShell>
      <PageHeader title="Quyết toán" back="/chi-tieu" />

      <section className="px-4 mt-4">
        <RoundedCard className="border-0 bg-gradient-to-br from-tint-blue to-tint-purple">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/80 grid place-items-center shrink-0">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/70">Tổng chi chung tháng này</p>
              <p className="text-2xl font-bold tabular-nums">{formatVND(s?.sharedTotal ?? 0)}</p>
              <p className="text-xs text-foreground/60 mt-0.5">
                Chia đều cho {s?.memberCount ?? 0} người · {formatVND(s?.sharePerHead ?? 0)}/người
              </p>
            </div>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <SectionHeader title="Số dư từng thành viên" />
        <RoundedCard className="space-y-2">
          {(s?.balances ?? []).length === 0 ? (
            <p className="text-xs text-foreground/60 text-center py-2">Chưa có dữ liệu.</p>
          ) : (
            s!.balances.map((b) => (
              <div key={b.memberId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-foreground/40" />
                  <span className="font-medium">{b.name}</span>
                </div>
                <span
                  className={`font-semibold tabular-nums ${
                    b.net > 1 ? "text-green-600" : b.net < -1 ? "text-red-600" : "text-foreground/60"
                  }`}
                >
                  {b.net >= 0 ? "+" : ""}
                  {formatVND(Math.round(b.net))}
                </span>
              </div>
            ))
          )}
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <SectionHeader title="Gợi ý chuyển khoản" />
        {(s?.transfers ?? []).length === 0 ? (
          <RoundedCard>
            <p className="text-xs text-foreground/60 text-center py-2">Đã cân bằng — không cần chuyển.</p>
          </RoundedCard>
        ) : (
          <div className="space-y-2">
            {s!.transfers.map((t, i) => (
              <RoundedCard key={i}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold flex-1 truncate">{t.fromName}</span>
                  <ArrowRight className="h-4 w-4 text-foreground/40 shrink-0" />
                  <span className="font-semibold flex-1 truncate">{t.toName}</span>
                  <span className="font-bold tabular-nums text-primary">{formatVND(t.amount)}</span>
                </div>
              </RoundedCard>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-5">
        <button
          onClick={handleExport}
          disabled={!familyId}
          className="w-full rounded-2xl border border-border bg-background py-3 flex items-center justify-center gap-2 text-sm font-semibold active:scale-[0.98] transition disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Xuất báo cáo CSV
        </button>
      </section>

      <div className="h-8" />
    </MobileShell>
  );
}
