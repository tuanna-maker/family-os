import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { formatVND } from "@shared/utils/formatters";
import { Camera, Sparkles, Trash2, Loader2, Plus } from "lucide-react";
import { supabase } from "@shared/supabase/client";
import { getMyContext } from "@/api/auth";
import { listExpenses, deleteExpense, createExpense } from "@/api/expenses";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/ui/ui/dialog";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Button } from "@shared/ui/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/ui/select";
import { toast } from "sonner";

const CTX_STALE_MS = 5 * 60_000;
const DATA_STALE_MS = 60_000;
const BUDGET_MONTH = 25000000; // 25 Triệu

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Ăn uống": { icon: "🍱", color: "#10B981" },
  "Nhà cửa": { icon: "🏠", color: "#3B82F6" },
  "Con cái": { icon: "🎒", color: "#EC4899" },
  "Sức khỏe": { icon: "💊", color: "#EF4444" },
  "Giải trí": { icon: "🎬", color: "#F59E0B" },
  "Khác": { icon: "✨", color: "#8B5CF6" },
};

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
  const qc = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");

  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getMyContext(),
    staleTime: CTX_STALE_MS,
  });
  const familyId = ctxQ.data?.family?.id;

  const expensesQ = useQuery({
    queryKey: ["expenses", familyId],
    queryFn: () => listExpenses({ family_id: familyId! }),
    enabled: !!familyId,
    staleTime: DATA_STALE_MS,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteExpense({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", familyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addM = useMutation({
    mutationFn: (data: any) => createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      setOpenAdd(false);
      setTitle("");
      setAmount("");
      toast.success("Đã thêm khoản chi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const userExpenses = expensesQ.data ?? [];
  const total = userExpenses.reduce((s, e) => s + e.amount, 0);
  const pct = Math.min(100, Math.round((total / BUDGET_MONTH) * 100));

  const catSums: Record<string, number> = {};
  for (const e of userExpenses) {
    const c = e.category;
    catSums[c] = (catSums[c] || 0) + e.amount;
  }
  const categoryStats = Object.keys(catSums)
    .map((c) => ({
      name: c,
      amount: catSums[c],
      meta: CATEGORY_META[c] || CATEGORY_META["Khác"],
    }))
    .sort((a, b) => b.amount - a.amount);

  const insight = pct > 90 
    ? "Ngân sách tháng này sắp hết, hãy chú ý các khoản lớn!" 
    : "Chi tiêu tháng này đang trong tầm kiểm soát.";

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) {
      toast.error("Không tìm thấy thông tin gia đình");
      return;
    }
    addM.mutate({
      family_id: familyId,
      title,
      amount: parseInt(amount, 10),
      category,
      spent_on: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" title="Chi tiêu gia đình" subtitle="Tháng này" back="/gia-dinh" />

      <section className="px-4">
        <RoundedCard className="bg-gradient-to-br from-brand to-navy text-white border-0">
          <p className="text-xs text-white/70 uppercase font-semibold tracking-wider">Tổng chi tháng này</p>
          <p className="text-3xl font-bold mt-1">{formatVND(total)}</p>
          <p className="text-xs text-white/70 mt-1">
            Trên ngân sách {formatVND(BUDGET_MONTH)}
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
          <p className="text-sm leading-snug">{insight}</p>
        </RoundedCard>
      </section>

      {categoryStats.length > 0 && (
        <section className="px-4 mt-5">
          <SectionHeader title="Theo danh mục" />
          <div className="grid grid-cols-2 gap-3">
            {categoryStats.map((c) => (
              <RoundedCard key={c.name} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{c.meta.icon}</span>
                  <span className="h-2 w-2 rounded-full" style={{ background: c.meta.color }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{c.name}</p>
                <p className="text-sm font-bold">{formatVND(c.amount)}</p>
              </RoundedCard>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3.5">
          <SectionHeader
            title="Giao dịch gần đây"
            subtitle={userExpenses.length > 0 ? `${userExpenses.length} khoản` : undefined}
          />
          <button onClick={() => setOpenAdd(true)} className="h-8 px-3 rounded-full bg-brand text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition">
            <Plus className="h-3.5 w-3.5" /> Thêm
          </button>
        </div>

        <RoundedCard className="p-0 divide-y divide-border">
          {expensesQ.isLoading && (
            <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </div>
          )}
          {userExpenses.length === 0 && !expensesQ.isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">Chưa có khoản chi nào.</div>
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
                {t.source === "scan" ? "✨" : CATEGORY_META[t.category]?.icon || "🧾"}
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
        </RoundedCard>
      </section>

      <Link
        to="/chi-tieu/scan"
        className="fixed bottom-24 right-5 z-50 h-14 px-5 rounded-2xl bg-gradient-to-br from-brand to-pink text-white shadow-[var(--shadow-pop)] flex items-center gap-2 font-semibold active:scale-95 transition"
      >
        <Camera className="h-5 w-5" />
        <span className="text-sm">Quét hóa đơn</span>
      </Link>

      {openAdd && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card rounded-2xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setOpenAdd(false)}
              className="absolute right-4 top-4 h-8 w-8 grid place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <h2 className="text-xl font-bold mb-4">Thêm khoản chi</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Tên khoản chi</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Mua gạo" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Số tiền (VNĐ)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_META).map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_META[c].icon} {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl bg-brand text-white font-semibold mt-2" disabled={addM.isPending}>
                {addM.isPending ? "Đang lưu..." : "Lưu khoản chi"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
