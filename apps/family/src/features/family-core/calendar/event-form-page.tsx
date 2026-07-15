import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { cn } from "@shared/utils";
import {
  upsertFamilyEvent,
  type FamilyEventRow,
  type EventCategory,
  type EventScope,
} from "@/api/family-events";

const CATS: { id: EventCategory; label: string; icon: string }[] = [
  { id: "school", label: "Học tập", icon: "🎒" },
  { id: "medical", label: "Y tế", icon: "🏥" },
  { id: "medication", label: "Thuốc", icon: "💊" },
  { id: "travel", label: "Du lịch", icon: "✈️" },
  { id: "family", label: "Gia đình", icon: "👨‍👩‍👧" },
  { id: "payment", label: "Thanh toán", icon: "💳" },
];

const SCOPES: { id: EventScope; label: string }[] = [
  { id: "all", label: "Cả nhà" },
  { id: "children", label: "Con cái" },
  { id: "elderly", label: "Ông bà" },
  { id: "health", label: "Sức khỏe" },
  { id: "travel", label: "Du lịch" },
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStartsAt(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T09:00:00`) : new Date();
  if (!dateStr) d.setHours(9, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

export function EventFormPage({
  familyId,
  row,
  defaultDate,
}: {
  familyId: string;
  row?: FamilyEventRow;
  defaultDate?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState(row?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(row?.category ?? "family");
  const [scope, setScope] = useState<EventScope>(row?.member_scope ?? "all");
  const [memberName, setMemberName] = useState(row?.member_name ?? "");
  const [startsAt, setStartsAt] = useState(
    row?.starts_at ? toLocalInput(row.starts_at) : defaultStartsAt(defaultDate),
  );
  const [location, setLocation] = useState(row?.location ?? "");
  const [remind, setRemind] = useState(
    row?.remind_minutes_before != null ? String(row.remind_minutes_before) : "",
  );
  const [notes, setNotes] = useState(row?.notes ?? "");

  const mut = useMutation({
    mutationFn: () =>
      upsertFamilyEvent({
        ...(row?.id ? { id: row.id } : {}),
        family_id: familyId,
        title,
        category,
        member_scope: scope,
        member_name: memberName || null,
        starts_at: new Date(startsAt).toISOString(),
        location: location || null,
        remind_minutes_before: remind ? Number(remind) : null,
        notes: notes || null,
        all_day: false,
      }),
    onSuccess: () => {
      toast.success(row ? "Đã cập nhật" : "Đã thêm sự kiện");
      qc.invalidateQueries({ queryKey: ["family-events", familyId] });
      navigate({ to: "/lich-gia-dinh" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Lịch gia đình"
        title={row ? "Sửa sự kiện" : "Thêm sự kiện"}
        back="/lich-gia-dinh"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          mut.mutate();
        }}
      >
        <FormScreen
          footer={
            <FormPrimaryButton type="submit" disabled={!title.trim() || mut.isPending}>
              {mut.isPending ? "Đang lưu…" : row ? "Cập nhật" : "Thêm sự kiện"}
            </FormPrimaryButton>
          }
        >
          <FormField label="Tiêu đề">
            <FormTextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bé Minh đi học"
            />
          </FormField>

          <div>
            <p className="text-sm font-medium mb-2">Loại sự kiện</p>
            <div className="grid grid-cols-3 gap-2">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "h-14 rounded-2xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 transition active:scale-[0.98]",
                    category === c.id ? "border-brand bg-tint-blue" : "border-border bg-card",
                  )}
                >
                  <span className="text-base">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <InlineSelect
              label="Phạm vi"
              value={scope}
              onChange={(v) => setScope(v as EventScope)}
              options={SCOPES.map((s) => ({ value: s.id, label: s.label }))}
            />
            <FormField label="Tên (tuỳ chọn)">
              <FormTextInput
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Bé Minh"
              />
            </FormField>
          </div>

          <DateField
            label="Bắt đầu"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Địa điểm">
              <FormTextInput
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Trường…"
              />
            </FormField>
            <FormField label="Nhắc trước (phút)">
              <FormTextInput
                type="number"
                inputMode="numeric"
                value={remind}
                onChange={(e) => setRemind(e.target.value)}
                placeholder="15"
                min={0}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <FormTextarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </FormScreen>
      </form>
    </MobileShell>
  );
}
