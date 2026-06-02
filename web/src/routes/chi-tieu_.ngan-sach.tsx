import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { formatVND } from "@/features/shared";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  DEFAULT_CATEGORIES,
  getBudget,
  upsertBudget,
} from "@/lib/expense-budgets.functions";

export const Route = createFileRoute("/chi-tieu_/ngan-sach")({
  head: () => ({ meta: [{ title: "Ngân sách gia đình — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: BudgetPage,
});

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function BudgetPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getCtx = useServerFn(getMyContext);
  const loadBudget = useServerFn(getBudget);
  const saveBudget = useServerFn(upsertBudget);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 300_000 });
  const familyId = ctxQ.data?.family?.id;
  const month = currentMonth();

  const budgetQ = useQuery({
    queryKey: ["budget", familyId, month],
    queryFn: () => loadBudget({ data: { family_id: familyId!, month } }),
    enabled: !!familyId,
  });

  const [total, setTotal] = useState<string>("");
  const [perCat, setPerCat] = useState<Record<string, string>>({});
  const [threshold, setThreshold] = useState<number>(80);
  const [hydrated, setHydrated] = useState(false);

  useMemo(() => {
    if (budgetQ.data && !hydrated) {
      setTotal(budgetQ.data.total_amount ? String(budgetQ.data.total_amount) : "");
      const init: Record<string, string> = {};
      for (const c of DEFAULT_CATEGORIES) {
        init[c.name] = budgetQ.data.per_category[c.name] ? String(budgetQ.data.per_category[c.name]) : "";
      }
      setPerCat(init);
      setThreshold(budgetQ.data.warning_threshold);
      setHydrated(true);
    }
  }, [budgetQ.data, hydrated]);

  const save = useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error("Chưa có gia đình");
      const per_category: Record<string, number> = {};
      for (const [k, v] of Object.entries(perCat)) {
        const n = Number(v);
        if (!Number.isNaN(n) && n > 0) per_category[k] = n;
      }
      return saveBudget({
        data: {
          family_id: familyId,
          month,
          total_amount: Number(total) || 0,
          per_category,
          warning_threshold: threshold,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget", familyId, month] });
      qc.invalidateQueries({ queryKey: ["monthly-summary", familyId] });
      navigate({ to: "/chi-tieu" });
    },
  });

  const totalCats = Object.values(perCat).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalNum = Number(total) || 0;

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
          <h1 className="text-xl font-bold">Ngân sách tháng {month.slice(5)}/{month.slice(0, 4)}</h1>
        </div>
      </div>

      {budgetQ.isLoading ? (
        <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      ) : (
        <>
          <section className="px-4 mt-3">
            <RoundedCard>
              <label className="text-xs font-semibold text-muted-foreground">TỔNG NGÂN SÁCH THÁNG</label>
              <div className="mt-2 flex items-baseline gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-2xl font-bold bg-transparent border-b border-border focus:outline-none focus:border-brand py-1"
                />
                <span className="text-sm text-muted-foreground">VND</span>
              </div>
              {totalNum > 0 && totalCats > totalNum && (
                <p className="text-[11px] text-emergency mt-2">
                  ⚠ Tổng theo danh mục ({formatVND(totalCats)}) vượt ngân sách tháng.
                </p>
              )}

              <div className="mt-4">
                <label className="text-xs font-semibold text-muted-foreground">
                  CẢNH BÁO KHI DÙNG {threshold}% NGÂN SÁCH
                </label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full mt-2 accent-brand"
                />
              </div>
            </RoundedCard>
          </section>

          <section className="px-4 mt-5">
            <SectionHeader title="Ngân sách theo danh mục" subtitle="Tuỳ chọn — để trống nếu không giới hạn" />
            <RoundedCard className="p-0 divide-y divide-border">
              {DEFAULT_CATEGORIES.map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-3">
                  <div
                    className="h-10 w-10 rounded-2xl grid place-items-center text-base shrink-0"
                    style={{ background: `${c.color}22` }}
                  >
                    {c.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.name}</p>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={perCat[c.name] ?? ""}
                    onChange={(e) => setPerCat({ ...perCat, [c.name]: e.target.value })}
                    placeholder="0"
                    className="w-28 text-right text-sm font-semibold bg-muted/40 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              ))}
            </RoundedCard>
          </section>

          <div className="px-4 mt-6 pb-28">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !familyId}
              className="w-full h-12 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu ngân sách
            </button>
            {save.isError && (
              <p className="text-xs text-emergency mt-2 text-center">
                {(save.error as Error)?.message ?? "Có lỗi xảy ra"}
              </p>
            )}
          </div>
        </>
      )}
    </MobileShell>
  );
}
