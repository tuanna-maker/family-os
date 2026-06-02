import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { formatVND } from "@/features/shared";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  getCategoryBreakdown,
  getMonthlySummary,
  getTrend6m,
} from "@/lib/expense-budgets.functions";

export const Route = createFileRoute("/chi-tieu_/bao-cao")({
  head: () => ({ meta: [{ title: "Báo cáo chi tiêu — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: ReportsPage,
});

function ReportsPage() {
  const navigate = useNavigate();
  const getCtx = useServerFn(getMyContext);
  const loadSummary = useServerFn(getMonthlySummary);
  const loadCats = useServerFn(getCategoryBreakdown);
  const loadTrend = useServerFn(getTrend6m);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 300_000 });
  const familyId = ctxQ.data?.family?.id;

  const sumQ = useQuery({
    queryKey: ["monthly-summary", familyId],
    queryFn: () => loadSummary({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });
  const catQ = useQuery({
    queryKey: ["category-breakdown", familyId],
    queryFn: () => loadCats({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });
  const trendQ = useQuery({
    queryKey: ["trend-6m", familyId],
    queryFn: () => loadTrend({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });

  const trend = trendQ.data ?? [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.total));
  const cats = (catQ.data ?? []).filter((c) => c.amount > 0);
  const grandTotal = cats.reduce((s, c) => s + c.amount, 0) || 1;

  return (
    <MobileShell>
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <button
          onClick={() => navigate({ to: "/chi-tieu" })}
          className="h-10 w-10 rounded-2xl bg-muted grid place-items-center"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Family Core</p>
          <h1 className="text-xl font-bold">Báo cáo chi tiêu</h1>
        </div>
      </div>

      <section className="px-4 mt-3">
        <RoundedCard>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Tháng này</p>
          <p className="text-2xl font-bold mt-1">{formatVND(sumQ.data?.total ?? 0)}</p>
          <div className="flex items-center gap-2 text-xs mt-1">
            {sumQ.data && sumQ.data.deltaPct !== 0 && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  sumQ.data.deltaPct >= 0
                    ? "bg-emergency/10 text-emergency"
                    : "bg-success/10 text-success"
                }`}
              >
                {sumQ.data.deltaPct >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {sumQ.data.deltaPct >= 0 ? "+" : ""}
                {sumQ.data.deltaPct}% so với tháng trước
              </span>
            )}
            <span className="text-muted-foreground">{sumQ.data?.txnCount ?? 0} giao dịch</span>
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <SectionHeader title="Xu hướng 6 tháng" />
        <RoundedCard>
          <div className="flex items-end justify-between gap-2 h-32 mt-1">
            {trend.map((t, i) => {
              const h = Math.max(4, Math.round((t.total / maxTrend) * 100));
              const isCur = i === trend.length - 1;
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {t.total > 0 ? `${Math.round(t.total / 1_000_000)}tr` : ""}
                  </div>
                  <div
                    className={`w-full rounded-t-md ${
                      isCur ? "bg-gradient-to-t from-brand to-pink" : "bg-brand/30"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                  <div className="text-[10px] text-muted-foreground">{t.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5 pb-20">
        <SectionHeader title="Phân bổ theo danh mục" />
        <RoundedCard className="p-0 divide-y divide-border">
          {cats.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">Chưa có giao dịch tháng này.</p>
          )}
          {cats.map((c) => {
            const pct = Math.round((c.amount / grandTotal) * 100);
            return (
              <div key={c.name} className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-2xl grid place-items-center text-base shrink-0"
                    style={{ background: `${c.color}22` }}
                  >
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{pct}% tổng chi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatVND(c.amount)}</p>
                    {c.deltaPct !== 0 && (
                      <p
                        className={`text-[11px] ${
                          c.deltaPct >= 0 ? "text-emergency" : "text-success"
                        }`}
                      >
                        {c.deltaPct >= 0 ? "+" : ""}
                        {c.deltaPct}%
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: c.color }}
                  />
                </div>
              </div>
            );
          })}
        </RoundedCard>
      </section>
    </MobileShell>
  );
}
