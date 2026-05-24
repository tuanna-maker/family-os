import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { expenses as mockExpenses } from "@/features/family-core";
import { formatVND } from "@/features/shared";
import { Camera, Sparkles, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import { listExpenses, deleteExpense } from "@/lib/expenses.functions";

const CTX_STALE_MS = 5 * 60_000;
const DATA_STALE_MS = 60_000;

export const Route = createFileRoute("/chi-tieu")({
  head: () => ({ meta: [{ title: "Chi tiêu gia đình — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: ExpensesPage,
});

function ExpensesPage() {
  const getCtx = useServerFn(getMyContext);
  const listExp = useServerFn(listExpenses);
  const delExp = useServerFn(deleteExpense);
  const qc = useQueryClient();

  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getCtx(),
    staleTime: CTX_STALE_MS,
  });
  const familyId = ctxQ.data?.family?.id;

  const expensesQ = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExp({ data: { family_id: familyId! } }),
    enabled: !!familyId,
    staleTime: DATA_STALE_MS,
  });

  const del = useMutation({
    mutationFn: (id: string) => delExp({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", familyId] }),
  });

  const userExpenses = expensesQ.data ?? [];
  const extraTotal = userExpenses.reduce((s, e) => s + e.amount, 0);
  const total = mockExpenses.total + extraTotal;
  const pct = Math.min(100, Math.round((total / mockExpenses.budget) * 100));

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" title="Chi tiêu gia đình" subtitle="Tháng 6, 2026" />

      <section className="px-4">
        <RoundedCard className="bg-gradient-to-br from-brand to-navy text-white border-0">
          <p className="text-xs text-white/70 uppercase font-semibold tracking-wider">Tổng chi tháng này</p>
          <p className="text-3xl font-bold mt-1">{formatVND(total)}</p>
          <p className="text-xs text-white/70 mt-1">
            Trên ngân sách {formatVND(mockExpenses.budget)}
            {extraTotal > 0 && <span className="ml-1">· +{formatVND(extraTotal)} đã quét</span>}
          </p>
          <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-white/80 mt-2">Đã dùng {pct}% ngân sách</p>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <RoundedCard className="bg-tint-purple border-0 flex items-start gap-3">
          <div className="h-9 w-9 rounded-2xl bg-white grid place-items-center text-base shrink-0">
            <Sparkles className="h-4 w-4 text-pink" />
          </div>
          <p className="text-sm leading-snug">{mockExpenses.insight}</p>
        </RoundedCard>
      </section>

      <section className="px-4 mt-5">
        <SectionHeader title="Theo danh mục" />
        <div className="grid grid-cols-2 gap-3">
          {mockExpenses.categories.map((c) => (
            <RoundedCard key={c.name} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{c.icon}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{c.name}</p>
              <p className="text-sm font-bold">{formatVND(c.amount)}</p>
            </RoundedCard>
          ))}
        </div>
      </section>

      <section className="px-4 mt-6">
        <SectionHeader
          title="Giao dịch gần đây"
          subtitle={userExpenses.length > 0 ? `${userExpenses.length} khoản` : undefined}
        />
        <RoundedCard className="p-0 divide-y divide-border">
          {expensesQ.isLoading && (
            <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </div>
          )}
          {userExpenses.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 p-4 ${t.source === "scan" ? "bg-tint-green/30" : ""}`}
            >
              <div
                className={`h-10 w-10 rounded-2xl grid place-items-center text-base shrink-0 ${
                  t.source === "scan"
                    ? "bg-success/15 text-success"
                    : "bg-muted"
                }`}
              >
                {t.source === "scan" ? "✨" : "🧾"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.category} • {t.spent_on}
                  {t.source === "scan" ? " • Quét AI" : ""}
                </p>
              </div>
              <span className="text-sm font-semibold shrink-0">-{formatVND(t.amount)}</span>
              {t.source === "manual" && (
                <button
                  onClick={() => del.mutate(t.id)}
                  className="h-7 w-7 rounded-lg grid place-items-center text-muted-foreground hover:text-emergency shrink-0"
                  aria-label="Xoá"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {mockExpenses.recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-2xl bg-muted grid place-items-center text-base shrink-0">🧾</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.title}</p>
                <p className="text-[11px] text-muted-foreground">{t.category} • {t.date}</p>
              </div>
              <span className="text-sm font-semibold shrink-0">-{formatVND(t.amount)}</span>
            </div>
          ))}
        </RoundedCard>
      </section>

      <Link
        to="/chi-tieu/scan"
        className="fixed bottom-24 right-5 z-50 h-14 px-5 rounded-2xl bg-gradient-to-br from-brand to-pink text-white shadow-[var(--shadow-pop)] flex items-center gap-2 font-semibold active:scale-95 transition"
      >
        <Camera className="h-5 w-5" /> Quét hoá đơn
      </Link>
    </MobileShell>
  );
}
