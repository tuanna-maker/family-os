import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { createExpense, updateExpense } from "@/lib/expenses.functions";
import { DEFAULT_CATEGORIES } from "@/lib/expense-budgets.functions";

export type EditingExpense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  spent_on: string;
  note: string | null;
};

export function ManualExpenseDialog({
  familyId,
  open,
  onOpenChange,
  editing,
}: {
  familyId: string | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: EditingExpense | null;
}) {
  const qc = useQueryClient();
  const addExpense = useServerFn(createExpense);
  const editExpense = useServerFn(updateExpense);

  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0].name);
  const [spentOn, setSpentOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setSpentOn(editing.spent_on);
      setNote(editing.note ?? "");
    } else {
      setTitle("");
      setAmount("");
      setCategory(DEFAULT_CATEGORIES[0].name);
      setSpentOn(today);
      setNote("");
    }
    setError("");
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error("Chưa có gia đình");
      const amt = Math.round(Number(amount.replace(/[.,\s]/g, "")) || 0);
      if (!title.trim()) throw new Error("Nhập tên khoản chi");
      if (amt <= 0) throw new Error("Số tiền phải > 0");
      if (editing) {
        await editExpense({
          data: {
            id: editing.id,
            title: title.trim(),
            category,
            amount: amt,
            spent_on: spentOn,
            note: note.trim() || undefined,
          },
        });
      } else {
        await addExpense({
          data: {
            family_id: familyId,
            title: title.trim(),
            category,
            amount: amt,
            spent_on: spentOn,
            note: note.trim() || undefined,
          },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      qc.invalidateQueries({ queryKey: ["monthly-summary", familyId] });
      qc.invalidateQueries({ queryKey: ["category-breakdown", familyId] });
      onOpenChange(false);
    },
    onError: (e) => setError((e as Error).message),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand font-semibold">
              Chi tiêu
            </p>
            <h2 className="text-base font-bold">{editing ? "Sửa khoản chi" : "Thêm khoản chi thủ công"}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-xl grid place-items-center hover:bg-muted"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="Tên khoản chi" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vd: Đi chợ, Tiền học con…"
              className="w-full bg-muted/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
              maxLength={120}
            />
          </Field>

          <Field label="Số tiền (VNĐ)" required>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="numeric"
              placeholder="0"
              className="w-full bg-muted/40 rounded-xl px-3 py-2.5 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>

          <Field label="Danh mục">
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CATEGORIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setCategory(c.name)}
                  type="button"
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1 ${
                    category === c.name
                      ? "bg-brand text-white border-brand"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  <span>{c.icon}</span> {c.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Ngày chi">
            <input
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              max={today}
              className="w-full bg-muted/40 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>

          <Field label="Ghi chú (tuỳ chọn)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Ghi nhớ thêm…"
              className="w-full bg-muted/40 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 resize-none"
            />
          </Field>

          {error && (
            <p className="text-xs text-emergency font-medium">{error}</p>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-2xl bg-card border border-border py-3 font-semibold text-sm active:scale-95 transition"
          >
            Huỷ
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex-[1.4] rounded-2xl bg-gradient-to-br from-brand to-pink text-white py-3 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu khoản chi
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label} {required && <span className="text-emergency">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
