import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ManualExpenseDialog, type EditingExpense } from "@/features/expense-core/components/ManualExpenseDialog";
import {
  Camera,
  Sparkles,
  Trash2,
  Pencil,
  Loader2,
  Lock,
  Plus,
  PieChart,
  Wallet,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { formatVND } from "@/features/shared";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import { listExpenses, deleteExpense, deleteReceiptScan } from "@/lib/expenses.functions";
import {
  getCategoryBreakdown,
  getMonthlySummary,
} from "@/lib/expense-budgets.functions";
import { getOcrEntitlement } from "@/lib/expense-ocr.functions";

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
  loader: ({ context }) => {
    if (typeof window === "undefined") return;
    // Preheat my-context so familyId-dependent queries fire 1 RTT sooner
    context.queryClient.prefetchQuery({
      queryKey: ["my-context"],
      queryFn: () => getMyContext(),
      staleTime: CTX_STALE_MS,
    });
  },
  component: ExpensesPage,
});

function ExpensesPage() {
  const getCtx = useServerFn(getMyContext);
  const listExp = useServerFn(listExpenses);
  const delExp = useServerFn(deleteExpense);
  const delScan = useServerFn(deleteReceiptScan);
  const loadSummary = useServerFn(getMonthlySummary);
  const loadCats = useServerFn(getCategoryBreakdown);
  const loadEnt = useServerFn(getOcrEntitlement);
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<EditingExpense | null>(null);
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const isCurrentMonth = (() => {
    const d = new Date();
    return month === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getCtx(),
    staleTime: CTX_STALE_MS,
  });
  const familyId = ctxQ.data?.family?.id;

  const expensesQ = useQuery({
    queryKey: ["expenses", familyId, month],
    queryFn: () => listExp({ data: { family_id: familyId!, month } }),
    enabled: !!familyId,
    staleTime: DATA_STALE_MS,
  });
  const sumQ = useQuery({
    queryKey: ["monthly-summary", familyId, month],
    queryFn: () => loadSummary({ data: { family_id: familyId!, month } }),
    enabled: !!familyId,
    staleTime: DATA_STALE_MS,
  });
  const catQ = useQuery({
    queryKey: ["category-breakdown", familyId, month],
    queryFn: () => loadCats({ data: { family_id: familyId!, month } }),
    enabled: !!familyId,
    staleTime: DATA_STALE_MS,
  });
  const entQ = useQuery({
    queryKey: ["ocr-entitlement", familyId],
    queryFn: () => loadEnt({ data: { family_id: familyId! } }),
    enabled: !!familyId,
    staleTime: 60_000,
  });

  const del = useMutation({
    mutationFn: (item: { id: string; source: "manual" | "scan" }) =>
      item.source === "scan"
        ? delScan({ data: { id: item.id } })
        : delExp({ data: { id: item.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId, month] });
      qc.invalidateQueries({ queryKey: ["monthly-summary", familyId, month] });
      qc.invalidateQueries({ queryKey: ["category-breakdown", familyId, month] });
    },
  });

  const userExpenses = expensesQ.data ?? [];
  const summary = sumQ.data;
  const cats = (catQ.data ?? []).filter((c) => c.amount > 0);
  const monthLabel = summary?.month
    ? `Tháng ${summary.month.slice(5)}/${summary.month.slice(0, 4)}`
    : "Tháng này";

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" title="Chi tiêu gia đình" subtitle={monthLabel} />

      {/* MONTH SWITCHER */}
      <section className="px-4 -mt-2 mb-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1 shadow-sm">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-7 w-7 rounded-full grid place-items-center text-muted-foreground hover:bg-muted active:scale-95 transition"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-semibold tabular-nums min-w-[88px] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            className="h-7 w-7 rounded-full grid place-items-center text-muted-foreground hover:bg-muted active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* MONTHLY SUMMARY CARD */}
      <section className="px-4">
        <RoundedCard className="bg-gradient-to-br from-brand to-navy text-white border-0">
          <p className="text-xs text-white/70 uppercase font-semibold tracking-wider">
            Tổng chi tháng này
          </p>
          <p className="text-3xl font-bold mt-1">{formatVND(summary?.total ?? 0)}</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] mt-1.5">
            {summary && summary.deltaPct !== 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15">
                {summary.deltaPct >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {summary.deltaPct >= 0 ? "+" : ""}
                {summary.deltaPct}% vs tháng trước
              </span>
            )}
            <span className="text-white/70">{summary?.txnCount ?? 0} giao dịch</span>
          </div>
          {summary && summary.budget > 0 ? (
            <>
              <p className="text-xs text-white/70 mt-3">
                Còn {formatVND(summary.remaining)} / Ngân sách {formatVND(summary.budget)}
              </p>
              <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    summary.usagePct >= 100
                      ? "bg-emergency"
                      : summary.usagePct >= summary.warningThreshold
                      ? "bg-warning"
                      : "bg-white"
                  }`}
                  style={{ width: `${Math.min(100, summary.usagePct)}%` }}
                />
              </div>
              <p className="text-[11px] text-white/80 mt-2">Đã dùng {summary.usagePct}% ngân sách</p>
            </>
          ) : (
            <Link
              to="/chi-tieu_/ngan-sach"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition"
            >
              <Wallet className="h-3.5 w-3.5" /> Thiết lập ngân sách tháng
            </Link>
          )}
        </RoundedCard>
      </section>

      {/* AI INSIGHT */}
      <section className="px-4 mt-5">
        <Link to="/chi-tieu_/insights" className="block">
          <RoundedCard className="relative overflow-hidden border-0 bg-gradient-to-br from-tint-purple to-tint-pink active:scale-[0.99] transition">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/80 grid place-items-center shrink-0">
                <Sparkles className="h-5 w-5 text-pink" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">AI Insight</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-foreground/10 px-1.5 py-0.5 rounded-full uppercase">
                    <Lock className="h-2.5 w-2.5" /> Premium
                  </span>
                </div>
                <p className="text-xs text-foreground/70 mt-1 leading-snug">
                  Phân tích xu hướng, cảnh báo bất thường và gợi ý tiết kiệm tự động.
                </p>
                <span className="mt-2 inline-block text-xs font-semibold text-pink">
                  Xem chi tiết →
                </span>
              </div>
            </div>
          </RoundedCard>
        </Link>
      </section>


      {/* DONUT + CATEGORY GRID */}
      <section className="px-4 mt-5">
        <SectionHeader title="Theo danh mục" subtitle={cats.length > 0 ? undefined : "Chưa có giao dịch"} />
        {cats.length > 0 && (
          <RoundedCard className="mb-3">
            <div className="flex items-center gap-4">
              <DonutChart data={cats.slice(0, 6).map((c) => ({ value: c.amount, color: c.color }))} />
              <div className="flex-1 min-w-0 space-y-1.5">
                {cats.slice(0, 4).map((c) => {
                  const pct = Math.round((c.amount / (summary?.total || 1)) * 100);
                  return (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-semibold tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </RoundedCard>
        )}

        <div className="grid grid-cols-2 gap-3">
          {(cats.length > 0 ? cats : []).slice(0, 6).map((c) => (
            <RoundedCard key={c.name} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{c.icon}</span>
                {c.deltaPct !== 0 && (
                  <span
                    className={`text-[10px] font-semibold ${
                      c.deltaPct >= 0 ? "text-emergency" : "text-success"
                    }`}
                  >
                    {c.deltaPct >= 0 ? "+" : ""}
                    {c.deltaPct}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{c.name}</p>
              <p className="text-sm font-bold tabular-nums">{formatVND(c.amount)}</p>
              {c.budget > 0 && (
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((c.amount / c.budget) * 100))}%`,
                      background: c.color,
                    }}
                  />
                </div>
              )}
            </RoundedCard>
          ))}
        </div>
      </section>

      {/* OCR QUOTA BANNER */}
      <section className="px-4 mt-5">
        <RoundedCard className="bg-muted/40 border-dashed border-2 border-border flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-background grid place-items-center shrink-0">
            <Camera className="h-4 w-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">Quét hoá đơn tự động (OCR)</p>
            <p className="text-[11px] text-muted-foreground">
              {entQ.data
                ? `Còn ${entQ.data.remaining}/${entQ.data.quota} lượt tháng này • Gói ${entQ.data.plan === "premium" ? "Premium" : "Free"}`
                : "Đang kiểm tra hạn mức…"}
            </p>
          </div>
          <Link
            to="/chi-tieu_/scan"
            className="text-[10px] font-semibold bg-brand text-white px-2.5 py-1 rounded-full uppercase shrink-0"
          >
            Quét ngay
          </Link>
        </RoundedCard>
      </section>

      {/* RECENT TRANSACTIONS */}
      <section className="px-4 mt-6 pb-32">
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
          {!expensesQ.isLoading && userExpenses.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Chưa có giao dịch nào. Hãy thêm khoản chi đầu tiên.
            </div>
          )}
          {userExpenses.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 p-4 ${t.source === "scan" ? "bg-tint-green/30" : ""}`}
            >
              <div
                className={`h-10 w-10 rounded-2xl grid place-items-center text-base shrink-0 ${
                  t.source === "scan" ? "bg-success/15 text-success" : "bg-muted"
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
              <span className="text-sm font-semibold shrink-0 tabular-nums">
                -{formatVND(t.amount)}
              </span>
              {t.source === "manual" && (
                <button
                  onClick={() =>
                    setEditing({
                      id: t.id,
                      title: t.title,
                      category: t.category,
                      amount: t.amount,
                      spent_on: t.spent_on,
                      note: t.note,
                    })
                  }
                  className="h-7 w-7 rounded-lg grid place-items-center text-muted-foreground hover:text-brand shrink-0"
                  aria-label="Sửa"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => del.mutate({ id: t.id, source: t.source })}
                className="h-7 w-7 rounded-lg grid place-items-center text-muted-foreground hover:text-emergency shrink-0"
                aria-label="Xoá"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </RoundedCard>
      </section>

      {/* SECONDARY NAV */}
      <section className="px-4 -mt-2 mb-24 grid grid-cols-2 gap-3">
        <Link to="/chi-tieu_/dinh-ky" className="rounded-2xl border border-border bg-background p-3 active:scale-95 transition">
          <p className="text-xs font-semibold">🔁 Định kỳ</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Tiền điện, học phí…</p>
        </Link>
        <Link to="/chi-tieu_/chia-se" className="rounded-2xl border border-border bg-background p-3 active:scale-95 transition">
          <p className="text-xs font-semibold">🛡️ Phân quyền</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Ai được làm gì</p>
        </Link>
        <Link to="/chi-tieu_/quyet-toan" className="rounded-2xl border border-border bg-background p-3 active:scale-95 transition">
          <p className="text-xs font-semibold">💸 Quyết toán</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Ai trả ai, xuất CSV</p>
        </Link>
        <Link to="/chi-tieu_/insights" className="rounded-2xl border border-border bg-background p-3 active:scale-95 transition">
          <p className="text-xs font-semibold">✨ AI Insights</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Phân tích &amp; cảnh báo</p>
        </Link>
        <Link to="/chi-tieu_/thong-bao" className="col-span-2 rounded-2xl border border-border bg-background p-3 active:scale-95 transition">
          <p className="text-xs font-semibold">🔔 Thông báo & nhắc lịch</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cảnh báo ngân sách, khoản định kỳ sắp đến hạn</p>
        </Link>
        <Link to="/chi-tieu_/premium" className="col-span-2 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-pink-50 p-3 active:scale-95 transition">
          <p className="text-xs font-semibold flex items-center gap-1">👑 Nâng cấp Premium</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Mở khoá OCR 50/tháng, AI Insights, báo cáo nâng cao</p>
        </Link>
      </section>


      {/* BOTTOM ACTION BAR — đẩy lên khỏi BottomNav (~bottom-0 + ~88px) */}
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-background/95 backdrop-blur-xl border border-border shadow-[var(--shadow-pop)] p-2 flex items-center gap-1 pointer-events-auto">
          <ActionBtn to="/chi-tieu_/ngan-sach" icon={<Wallet className="h-4 w-4" />} label="Ngân sách" />
          <ActionBtn to="/chi-tieu_/bao-cao" icon={<PieChart className="h-4 w-4" />} label="Báo cáo" />
          <Link
            to="/chi-tieu_/scan"
            className="flex-[1.4] h-12 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition"
          >
            <Camera className="h-4 w-4" /> Quét
          </Link>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex-1 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-foreground/80 hover:bg-muted active:scale-95 transition"
          >
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        </div>
      </div>

      <ManualExpenseDialog
        familyId={familyId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      <ManualExpenseDialog
        familyId={familyId}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        editing={editing}
      />
    </MobileShell>
  );
}

function ActionBtn({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex-1 h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-foreground/80 hover:bg-muted active:scale-95 transition"
    >
      {icon}
      {label}
    </Link>
  );
}

function DonutChart({ data }: { data: Array<{ value: number; color: string }> }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 96;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
      {total > 0 &&
        data.map((d, i) => {
          const len = (d.value / total) * c;
          const dasharray = `${len} ${c - len}`;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
    </svg>
  );
}
