import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Refrigerator, ShoppingCart, ChefHat, Sparkles, Leaf, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, ErrorState, EmptyState } from "@shared/ui/common/States";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@shared/ui/ui/dialog";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Textarea } from "@shared/ui/ui/textarea";
import { supabase } from "@shared/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  listFood,
  upsertFoodItem,
  upsertShoppingItem,
  toggleShopping,
  deleteFoodRow,
  suggestMeals,
} from "@/api/food";

export const Route = createFileRoute("/thuc-pham")({
  head: () => ({ meta: [{ title: "Thực phẩm & Tủ lạnh — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: FoodPage,
});

const LOC_LABEL: Record<string, string> = {
  fridge: "Tủ lạnh",
  freezer: "Tủ đông",
  pantry: "Tủ bếp",
  other: "Khác",
};

type Dlg = { type: "food"; row?: any } | { type: "shop"; row?: any } | null;

function FoodPage() {
  const { familyId } = useFamilyContext();
          const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId! }),
    enabled: !!familyId,
  });
  const mealsQ = useQuery({
    queryKey: ["meal-suggest", familyId],
    queryFn: () => suggestMeals({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const [dlg, setDlg] = useState<Dlg>(null);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["food", familyId] });
    qc.invalidateQueries({ queryKey: ["meal-suggest", familyId] });
  };

  const tgMut = useMutation({
    mutationFn: (v: { id: string; purchased: boolean }) => toggleShopping(v),
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: (v: { table: any; id: string }) => deleteFoodRow(v),
    onSuccess: () => { toast.success("Đã xoá"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { expiringSoon, expired } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const soonLimit = new Date(today); soonLimit.setDate(soonLimit.getDate() + 3);
    const soon: any[] = []; const exp: any[] = [];
    (q.data?.items ?? []).forEach((it) => {
      if (!it.expires_on) return;
      const d = new Date(it.expires_on);
      if (d < today) exp.push(it);
      else if (d <= soonLimit) soon.push(it);
    });
    return { expiringSoon: soon, expired: exp };
  }, [q.data]);

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" title="Thực phẩm & Tủ lạnh" subtitle="Quản lý đồ ăn, hạn dùng, đi chợ" emoji="🥬" />

      {q.isLoading && <section className="px-4"><LoadingState /></section>}
      {q.isError && <section className="px-4"><ErrorState message={(q.error as Error).message} /></section>}

      {q.data && (
        <>
          {/* EXPIRING ALERT */}
          {(expired.length > 0 || expiringSoon.length > 0) && (
            <section className="px-4 mt-2">
              <RoundedCard className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 flex items-start gap-3">
                <div className="h-9 w-9 rounded-2xl bg-card grid place-items-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 text-sm">
                  {expired.length > 0 && <p className="font-semibold text-amber-900 dark:text-amber-200">{expired.length} món đã hết hạn</p>}
                  {expiringSoon.length > 0 && <p className="text-amber-800 dark:text-amber-300">{expiringSoon.length} món sắp hết hạn (≤ 3 ngày)</p>}
                </div>
              </RoundedCard>
            </section>
          )}

          {/* FOOD INVENTORY */}
          <section className="px-4 mt-4">
            <SectionHeader
              title="Tồn kho"
              subtitle={`${q.data.items.length} món`}
              action={<AddBtn onClick={() => setDlg({ type: "food" })} />}
            />
            {q.data.items.length === 0 ? (
              <EmptyState icon={<Refrigerator className="h-5 w-5" />} title="Tủ lạnh trống" description="Thêm món để theo dõi hạn dùng" />
            ) : (
              <div className="space-y-2">
                {q.data.items.map((it) => {
                  const status = getExpiryStatus(it.expires_on);
                  return (
                    <RoundedCard key={it.id} className="flex items-center gap-3 p-3">
                      <div className="h-9 w-9 rounded-2xl bg-tint-green grid place-items-center shrink-0">
                        <Leaf className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{it.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[it.qty && `${it.qty}${it.unit ?? ""}`, it.location && LOC_LABEL[it.location], it.category].filter(Boolean).join(" • ") || "—"}
                        </p>
                      </div>
                      {it.expires_on && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                      )}
                      <RowActions onEdit={() => setDlg({ type: "food", row: it })} onDelete={() => delMut.mutate({ table: "food_items", id: it.id })} />
                    </RoundedCard>
                  );
                })}
              </div>
            )}
          </section>

          {/* SHOPPING */}
          <section className="px-4 mt-6">
            <SectionHeader
              title="Đi chợ"
              subtitle={`${q.data.shopping.filter((s) => !s.purchased).length} chưa mua`}
              action={<AddBtn onClick={() => setDlg({ type: "shop" })} />}
            />
            {q.data.shopping.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="h-5 w-5" />} title="Chưa có món cần mua" />
            ) : (
              <RoundedCard className="p-0 divide-y divide-border">
                {q.data.shopping.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3">
                    <input type="checkbox" checked={s.purchased} onChange={(e) => tgMut.mutate({ id: s.id, purchased: e.target.checked })} className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${s.purchased ? "line-through text-muted-foreground" : ""}`}>{s.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[s.qty && `${s.qty}${s.unit ?? ""}`, s.category].filter(Boolean).join(" • ") || "—"}
                      </p>
                    </div>
                    <RowActions onEdit={() => setDlg({ type: "shop", row: s })} onDelete={() => delMut.mutate({ table: "shopping_items", id: s.id })} />
                  </div>
                ))}
              </RoundedCard>
            )}
          </section>

          {/* MEAL SUGGESTIONS */}
          <section className="px-4 mt-6">
            <SectionHeader title="Gợi ý bữa ăn" subtitle="Dựa trên đồ trong tủ" />
            <div className="space-y-2">
              {(mealsQ.data?.suggestions ?? []).map((s, i) => (
                <RoundedCard key={i} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-tint-yellow grid place-items-center shrink-0">
                    <ChefHat className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.reason}</p>
                  </div>
                </RoundedCard>
              ))}
            </div>
          </section>

          {/* FARM FRESH CTA */}
          <section className="px-4 mt-6">
            <RoundedCard className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/20 grid place-items-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider font-semibold text-white/80">Farm Fresh</p>
                  <p className="text-base font-bold mt-0.5">Rau củ tươi giao tận nhà</p>
                  <p className="text-xs text-white/80 mt-1">Đặt rau organic từ nông trại đối tác, giao trong ngày.</p>
                  <button className="mt-3 h-9 px-4 rounded-xl bg-white text-emerald-700 text-xs font-semibold">
                    Khám phá Farm Fresh
                  </button>
                </div>
              </div>
            </RoundedCard>
          </section>
        </>
      )}

      {dlg && familyId && (
        <FoodDialog state={dlg} familyId={familyId} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); invalidate(); }} />
      )}
    </MobileShell>
  );
}

function getExpiryStatus(expires_on: string | null) {
  if (!expires_on) return { label: "", cls: "" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(expires_on);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Quá ${-diff} ngày`, cls: "bg-destructive/15 text-destructive" };
  if (diff === 0) return { label: "Hết hạn hôm nay", cls: "bg-amber-100 text-amber-800" };
  if (diff <= 3) return { label: `Còn ${diff} ngày`, cls: "bg-amber-100 text-amber-800" };
  return { label: `Còn ${diff} ngày`, cls: "bg-muted text-muted-foreground" };
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-8 px-3 rounded-xl bg-brand text-white text-xs font-semibold inline-flex items-center gap-1">
      <Plus className="h-3.5 w-3.5" /> Thêm
    </button>
  );
}
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onEdit} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={onDelete} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function FoodDialog({ state, familyId, onClose, onSaved }: { state: NonNullable<Dlg>; familyId: string; onClose: () => void; onSaved: () => void }) {
      const [form, setForm] = useState<any>(state.row ?? {});
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const base = { ...form, family_id: familyId, id: state.row?.id ?? null };
      if (state.type === "food") {
        return upsertFoodItem({ ...base, qty: form.qty ? Number(form.qty) : null });
      }
      return upsertShoppingItem({ ...base, qty: form.qty ? Number(form.qty) : null, purchased: form.purchased ?? false });
    },
    onSuccess: () => { toast.success("Đã lưu"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{state.type === "food" ? (state.row ? "Sửa món" : "Thêm món vào tủ") : (state.row ? "Sửa món cần mua" : "Thêm món cần mua")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <FormField label="Tên *"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Số lượng"><Input type="number" step="0.1" value={form.qty ?? ""} onChange={(e) => set("qty", e.target.value)} /></FormField>
            <FormField label="Đơn vị"><Input placeholder="kg, hộp, quả" value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value)} /></FormField>
          </div>
          <FormField label="Loại"><Input placeholder="Rau, Thịt, Trái cây…" value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} /></FormField>
          {state.type === "food" && (
            <>
              <FormField label="Nơi cất">
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={form.location ?? ""} onChange={(e) => set("location", e.target.value || null)}>
                  <option value="">—</option>
                  <option value="fridge">Tủ lạnh</option>
                  <option value="freezer">Tủ đông</option>
                  <option value="pantry">Tủ bếp</option>
                  <option value="other">Khác</option>
                </select>
              </FormField>
              <FormField label="Hạn dùng"><Input type="date" value={form.expires_on ?? ""} onChange={(e) => set("expires_on", e.target.value)} /></FormField>
              <FormField label="Ghi chú"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Đang lưu…" : "Lưu"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
