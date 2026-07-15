import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import {
  FormScreen,
  FormField,
  FormTextInput,
  FormTextarea,
  DateField,
  FormPrimaryButton,
} from "@shared/ui/common/form-fields";
import { InlineSelect } from "@shared/ui/common/inline-select";
import { LoadingState } from "@shared/ui/common/States";
import { listFood, upsertFoodItem, upsertShoppingItem } from "@/api/food";

export type FoodFormType = "food" | "shop";

const LOC_OPTIONS = [
  { value: "", label: "— Không chọn —" },
  { value: "fridge", label: "Tủ lạnh" },
  { value: "freezer", label: "Tủ đông" },
  { value: "pantry", label: "Tủ bếp" },
  { value: "other", label: "Khác" },
];

const TITLES: Record<FoodFormType, [string, string]> = {
  food: ["Thêm món vào tủ", "Sửa món tồn kho"],
  shop: ["Thêm món cần mua", "Sửa món đi chợ"],
};

export function FoodFormPage({
  familyId,
  type,
  editId,
  backTo = "/thuc-pham",
  pageEyebrow = "Thực phẩm",
}: {
  familyId: string;
  type: FoodFormType;
  editId?: string;
  backTo?: string;
  pageEyebrow?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId }),
  });

  const existingRow = useMemo(() => {
    if (!editId || !q.data) return null;
    if (type === "food") return q.data.items.find((i) => i.id === editId) ?? null;
    return q.data.shopping.find((s) => s.id === editId) ?? null;
  }, [editId, q.data, type]);

  const [form, setForm] = useState<Record<string, unknown>>({ location: "fridge" });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (existingRow) {
      setForm({
        ...existingRow,
        location: (existingRow as { location?: string }).location ?? "fridge",
      });
    }
  }, [existingRow]);

  const [addTitle, editTitle] = TITLES[type];
  const pageTitle = existingRow ? editTitle : addTitle;

  const mut = useMutation({
    mutationFn: async () => {
      const name = String(form.name ?? "").trim();
      if (!name) throw new Error("Vui lòng nhập tên món");
      const base = {
        ...form,
        family_id: familyId,
        id: editId ?? null,
        name,
        qty: form.qty ? Number(form.qty) : null,
        unit: form.unit || null,
        category: form.category || null,
      };
      if (type === "food") {
        return upsertFoodItem({
          ...base,
          location: form.location || null,
          expires_on: form.expires_on || null,
          notes: form.notes || null,
        });
      }
      return upsertShoppingItem({
        ...base,
        purchased: form.purchased ?? false,
      });
    },
    onSuccess: () => {
      toast.success("Đã lưu");
      qc.invalidateQueries({ queryKey: ["food", familyId] });
      qc.invalidateQueries({ queryKey: ["meal-suggest", familyId] });
      navigate({ to: backTo as never });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <MobileShell>
        <PageHeader eyebrow={pageEyebrow} title={pageTitle} back={backTo} />
        <LoadingState />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader eyebrow={pageEyebrow} title={pageTitle} back={backTo} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <FormScreen
          footer={
            <FormPrimaryButton type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Đang lưu…" : "Lưu"}
            </FormPrimaryButton>
          }
        >
          <FormField label="Tên món *">
            <FormTextInput
              value={String(form.name ?? "")}
              onChange={(e) => set("name", e.target.value)}
              placeholder={type === "food" ? "Thịt bò, trứng…" : "Bánh mì, táo…"}
              autoFocus
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Số lượng">
              <FormTextInput
                type="number"
                step="0.1"
                inputMode="decimal"
                value={form.qty != null && form.qty !== "" ? String(form.qty) : ""}
                onChange={(e) => set("qty", e.target.value)}
                placeholder="1"
              />
            </FormField>
            <FormField label="Đơn vị">
              <FormTextInput
                value={String(form.unit ?? "")}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="kg, hộp…"
              />
            </FormField>
          </div>
          <FormField label="Loại">
            <FormTextInput
              value={String(form.category ?? "")}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Rau, Thịt, Trái cây…"
            />
          </FormField>
          {type === "food" && (
            <>
              <InlineSelect
                label="Nơi cất"
                value={String(form.location ?? "")}
                onChange={(v) => set("location", v || null)}
                options={LOC_OPTIONS}
              />
              <DateField
                label="Hạn dùng"
                value={String(form.expires_on ?? "")}
                onChange={(e) => set("expires_on", e.target.value || null)}
              />
              <FormField label="Ghi chú">
                <FormTextarea
                  value={String(form.notes ?? "")}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                />
              </FormField>
            </>
          )}
        </FormScreen>
      </form>
    </MobileShell>
  );
}
