import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, AlertTriangle, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { formatVND } from "@/features/shared";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  getLatestInsight,
  listAnomalies,
  detectAnomalies,
  generateInsight,
  resolveAnomaly,
} from "@/lib/expense-insights.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/chi-tieu_/insights")({
  head: () => ({ meta: [{ title: "AI Insights — Chi tiêu — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: InsightsPage,
});

function InsightsPage() {
  const getCtx = useServerFn(getMyContext);
  const loadInsight = useServerFn(getLatestInsight);
  const loadAnoms = useServerFn(listAnomalies);
  const detect = useServerFn(detectAnomalies);
  const generate = useServerFn(generateInsight);
  const resolve = useServerFn(resolveAnomaly);
  const qc = useQueryClient();

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx() });
  const familyId = ctxQ.data?.family?.id;

  const insightQ = useQuery({
    queryKey: ["expense-insight", familyId],
    queryFn: () => loadInsight({ data: { familyId: familyId! } }),
    enabled: !!familyId,
  });

  const anomQ = useQuery({
    queryKey: ["expense-anoms", familyId],
    queryFn: () => loadAnoms({ data: { familyId: familyId! } }),
    enabled: !!familyId,
  });

  const detectM = useMutation({
    mutationFn: () => detect({ data: { familyId: familyId! } }),
    onSuccess: (r) => {
      toast.success(`Đã quét: ${r.inserted} cảnh báo mới`);
      qc.invalidateQueries({ queryKey: ["expense-anoms", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const genM = useMutation({
    mutationFn: () => generate({ data: { familyId: familyId! } }),
    onSuccess: () => {
      toast.success("Đã tạo insight mới");
      qc.invalidateQueries({ queryKey: ["expense-insight", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveM = useMutation({
    mutationFn: (id: string) => resolve({ data: { anomalyId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-anoms", familyId] }),
  });

  const insight = insightQ.data?.insight;
  const anomalies = anomQ.data?.anomalies ?? [];

  return (
    <MobileShell>
      <PageHeader title="AI Insights" back="/chi-tieu" />

      <section className="px-4 mt-4">
        <RoundedCard className="border-0 bg-gradient-to-br from-tint-purple to-tint-pink">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/80 grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-pink" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Tóm tắt tháng này</p>
              {insightQ.isLoading ? (
                <p className="text-xs text-foreground/60 mt-1">Đang tải…</p>
              ) : insight ? (
                <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{insight.summary}</p>
              ) : (
                <p className="text-xs text-foreground/60 mt-1">
                  Chưa có insight. Nhấn "Tạo insight" để AI phân tích.
                </p>
              )}
              <button
                onClick={() => genM.mutate()}
                disabled={genM.isPending || !familyId}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-foreground text-background px-3 py-1.5 rounded-full disabled:opacity-50"
              >
                {genM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Tạo insight
              </button>
            </div>
          </div>
        </RoundedCard>
      </section>

      {insight?.recommendations && Array.isArray(insight.recommendations) && insight.recommendations.length > 0 && (
        <section className="px-4 mt-5">
          <SectionHeader title="Gợi ý tiết kiệm" />
          <RoundedCard className="space-y-2">
            {(insight.recommendations as string[]).map((r, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{r}</span>
              </div>
            ))}
          </RoundedCard>
        </section>
      )}

      {insight?.top_categories && Array.isArray(insight.top_categories) && insight.top_categories.length > 0 && (
        <section className="px-4 mt-5">
          <SectionHeader title="Top danh mục" />
          <RoundedCard className="space-y-2">
            {(insight.top_categories as Array<{ category: string; amount: number }>).map((c) => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <span>{c.category}</span>
                <span className="font-semibold tabular-nums">{formatVND(c.amount)}</span>
              </div>
            ))}
          </RoundedCard>
        </section>
      )}

      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <SectionHeader title={`Cảnh báo bất thường (${anomalies.length})`} />
          <button
            onClick={() => detectM.mutate()}
            disabled={detectM.isPending || !familyId}
            className="text-xs font-semibold inline-flex items-center gap-1 text-foreground/70"
          >
            {detectM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Quét
          </button>
        </div>
        {anomalies.length === 0 ? (
          <RoundedCard>
            <p className="text-xs text-foreground/60 text-center py-2">Không có cảnh báo nào.</p>
          </RoundedCard>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a: any) => (
              <RoundedCard key={a.id} className="border-l-4 border-l-orange-500">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{a.reason}</p>
                    {a.expenses && (
                      <p className="text-[11px] text-foreground/60 mt-0.5">
                        {a.expenses.category} • {formatVND(Number(a.expenses.amount))} •{" "}
                        {new Date(a.expenses.spent_on).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                    <button
                      onClick={() => resolveM.mutate(a.id)}
                      className="mt-1.5 text-[11px] font-semibold text-primary"
                    >
                      Đánh dấu đã xử lý
                    </button>
                  </div>
                </div>
              </RoundedCard>
            ))}
          </div>
        )}
      </section>

      <div className="h-8" />
    </MobileShell>
  );
}
