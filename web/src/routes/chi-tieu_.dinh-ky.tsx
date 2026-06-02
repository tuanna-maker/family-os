import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Power, Trash2, Loader2, RefreshCw, Repeat } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { formatVND } from "@/features/shared";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";
import {
  listRecurring,
  upsertRecurring,
  deleteRecurring,
  toggleRecurring,
  runRecurringNow,
  type RecurringRule,
} from "@/lib/expense-recurring.functions";
import { DEFAULT_CATEGORIES } from "@/lib/expense-budgets.functions";

export const Route = createFileRoute("/chi-tieu_/dinh-ky")({
  head: () => ({ meta: [{ title: "Chi tiêu định kỳ — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: RecurringPage,
});

const FREQS: Array<{ value: "daily" | "weekly" | "monthly"; label: string }> = [
  { value: "daily", label: "Hằng ngày" },
  { value: "weekly", label: "Hằng tuần" },
  { value: "monthly", label: "Hằng tháng" },
];

function RecurringPage() {
  const getCtx = useServerFn(getMyContext);
  const list = useServerFn(listRecurring);
  const upsert = useServerFn(upsertRecurring);
  const del = useServerFn(deleteRecurring);
  const toggle = useServerFn(toggleRecurring);
  const runNow = useServerFn(runRecurringNow);
  const qc = useQueryClient();

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getCtx(), staleTime: 5 * 60_000 });
  const familyId = ctxQ.data?.family?.id;

  const rulesQ = useQuery({
    queryKey: ["recurring", familyId],
    queryFn: () => list({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["recurring", familyId] });

  const saveM = useMutation({ mutationFn: upsert, onSuccess: () => { inv(); setOpen(false); } });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: inv });
  const togM = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: inv,
  });
  const runM = useMutation({
    mutationFn: () => runNow({ data: {} }),
    onSuccess: () => {
      inv();
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Chi tiêu"
        back="/chi-tieu"
        title="Chi tiêu định kỳ"
        subtitle="Tự động ghi nhận tiền điện, học phí, gói cước…"
      />

      <section className="px-4 flex gap-2">
        <button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="flex-1 h-11 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-semibold inline-flex items-center justify-center gap-1.5 text-sm active:scale-95"
        >
          <Plus className="h-4 w-4" /> Thêm quy tắc
        </button>
        <button
          onClick={() => runM.mutate()}
          disabled={runM.isPending}
          className="h-11 px-4 rounded-2xl bg-muted text-foreground/80 font-semibold inline-flex items-center gap-1.5 text-xs active:scale-95"
        >
          {runM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Chạy ngay
        </button>
      </section>

      {runM.data && (
        <p className="px-4 mt-2 text-xs text-success">Đã sinh {runM.data.processed} giao dịch.</p>
      )}

      <section className="px-4 mt-4 pb-24 space-y-3">
        {rulesQ.isLoading && (
          <RoundedCard className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </RoundedCard>
        )}
        {!rulesQ.isLoading && (rulesQ.data ?? []).length === 0 && (
          <RoundedCard className="text-center text-sm text-muted-foreground py-8">
            <Repeat className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
            Chưa có quy tắc nào. Thêm để hệ thống tự ghi chi tiêu định kỳ.
          </RoundedCard>
        )}
        {(rulesQ.data ?? []).map((r) => (
          <RoundedCard key={r.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-muted grid place-items-center text-lg shrink-0">
                {DEFAULT_CATEGORIES.find((c) => c.name === r.category)?.icon ?? "🔁"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.category} • {FREQS.find((f) => f.value === r.frequency)?.label} • Lần kế: {new Date(r.next_run_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                </p>
                <p className="text-sm font-bold tabular-nums mt-1">{formatVND(r.amount)}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => togM.mutate({ id: r.id, active: !r.active })}
                  className={`h-7 w-7 rounded-lg grid place-items-center ${r.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                  aria-label="Bật/tắt"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm("Xoá quy tắc này?")) delM.mutate(r.id); }}
                  className="h-7 w-7 rounded-lg grid place-items-center text-muted-foreground hover:text-emergency"
                  aria-label="Xoá"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <button
              onClick={() => { setEditing(r); setOpen(true); }}
              className="mt-2 text-[11px] font-semibold text-brand"
            >
              Chỉnh sửa →
            </button>
          </RoundedCard>
        ))}
      </section>

      {open && familyId && (
        <RuleSheet
          familyId={familyId}
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={(payload) => saveM.mutate({ data: payload })}
          saving={saveM.isPending}
        />
      )}
    </MobileShell>
  );
}

function RuleSheet({
  familyId,
  initial,
  onClose,
  onSave,
  saving,
}: {
  familyId: string;
  initial: RecurringRule | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    family_id: string;
    title: string;
    category: string;
    amount: number;
    frequency: "daily" | "weekly" | "monthly";
    next_run_at: string;
    active: boolean;
    note?: string;
  }) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Nhà cửa");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(initial?.frequency ?? "monthly");
  const [nextRun, setNextRun] = useState(
    initial?.next_run_at
      ? new Date(initial.next_run_at).toISOString().slice(0, 16)
      : new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 16),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  const submit = () => {
    if (!title.trim() || !amount) return;
    onSave({
      id: initial?.id,
      family_id: familyId,
      title: title.trim(),
      category,
      amount: Number(amount),
      frequency,
      next_run_at: new Date(nextRun).toISOString(),
      active,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-background rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-3">{initial ? "Sửa quy tắc" : "Quy tắc định kỳ"}</h3>

        <label className="text-xs font-semibold">Tên</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiền điện, Netflix…" className="mt-1 w-full h-11 rounded-2xl border border-border px-3 text-sm" />

        <label className="text-xs font-semibold mt-3 block">Số tiền (VND)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full h-11 rounded-2xl border border-border px-3 text-sm tabular-nums" />

        <label className="text-xs font-semibold mt-3 block">Danh mục</label>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {DEFAULT_CATEGORIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setCategory(c.name)}
              className={`h-14 rounded-2xl border text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 ${category === c.name ? "border-brand bg-brand/10" : "border-border"}`}
            >
              <span className="text-base">{c.icon}</span>
              <span className="truncate w-full text-center px-1">{c.name}</span>
            </button>
          ))}
        </div>

        <label className="text-xs font-semibold mt-3 block">Tần suất</label>
        <div className="mt-1 flex gap-2">
          {FREQS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={`flex-1 h-10 rounded-2xl border text-xs font-semibold ${frequency === f.value ? "border-brand bg-brand/10" : "border-border"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="text-xs font-semibold mt-3 block">Lần chạy kế tiếp</label>
        <input type="datetime-local" value={nextRun} onChange={(e) => setNextRun(e.target.value)} className="mt-1 w-full h-11 rounded-2xl border border-border px-3 text-sm" />

        <label className="text-xs font-semibold mt-3 block">Ghi chú</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full h-11 rounded-2xl border border-border px-3 text-sm" />

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
          Đang hoạt động
        </label>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-2xl bg-muted text-sm font-semibold">Huỷ</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-[1.4] h-11 rounded-2xl bg-gradient-to-br from-brand to-pink text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
