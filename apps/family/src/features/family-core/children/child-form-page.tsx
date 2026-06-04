import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import {
  listChildren,
  upsertChild,
  upsertSchedule,
  upsertHomework,
  upsertAchievement,
  upsertParentReminder,
} from "@/api/children";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export type ChildFormType = "child" | "schedule" | "homework" | "achievement" | "reminder";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const TITLES: Record<ChildFormType, [string, string]> = {
  child: ["Thêm con", "Sửa hồ sơ con"],
  schedule: ["Thêm tiết học", "Sửa tiết học"],
  homework: ["Thêm bài tập", "Sửa bài tập"],
  achievement: ["Thêm thành tích", "Sửa thành tích"],
  reminder: ["Thêm nhắc", "Sửa nhắc"],
};

export function ChildFormPage({
  familyId,
  type,
  childId,
  editId,
}: {
  familyId: string;
  type: ChildFormType;
  childId?: string;
  editId?: string;
}) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId }),
  });

  const existingRow = useMemo(() => {
    if (!editId || !q.data) return null;
    if (type === "child") return q.data.children.find((c) => c.id === editId) ?? null;
    if (type === "schedule") return q.data.schedules.find((s) => s.id === editId) ?? null;
    if (type === "homework") return q.data.homeworks.find((h) => h.id === editId) ?? null;
    if (type === "achievement") return q.data.achievements.find((a) => a.id === editId) ?? null;
    if (type === "reminder") return q.data.reminders.find((r) => r.id === editId) ?? null;
    return null;
  }, [editId, q.data, type]);

  const children = q.data?.children ?? [];
  const initialChild = childId ?? (existingRow as { child_id?: string } | null)?.child_id ?? children[0]?.id;
  const [form, setForm] = useState<any>(() => ({
    child_id: initialChild,
    ...(existingRow ?? {}),
  }));
  const set = (k: string, v: unknown) => setForm((f: Record<string, unknown>) => ({ ...f, [k]: v }));

  const [title, sub] = TITLES[type];
  const pageTitle = existingRow ? sub : title;

  const childOptions = children.map((c) => ({ value: c.id, label: c.name }));
  const dayOptions = DAYS.map((d, i) => ({ value: String(i), label: d }));
  const reminderChildOptions = [
    { value: "", label: "— Chung —" },
    ...children.map((c) => ({ value: c.id, label: c.name })),
  ];

  const mut = useMutation({
    mutationFn: async () => {
      const base = { ...form, family_id: familyId, id: editId ?? null };
      if (type === "child") return upsertChild(base);
      if (type === "schedule") return upsertSchedule({ ...base, day_of_week: Number(form.day_of_week ?? 1) });
      if (type === "homework") return upsertHomework({ ...base, done: form.done ?? false });
      if (type === "achievement") return upsertAchievement(base);
      if (type === "reminder") {
        if (!form.remind_at) throw new Error("Chọn thời gian");
        return upsertParentReminder({
          ...base,
          remind_at: new Date(form.remind_at as string).toISOString(),
          done: form.done ?? false,
        });
      }
    },
    onSuccess: () => {
      toast.success("Đã lưu");
      navigate({ to: "/con-cai" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <LoadingState />;

  return (
    <MobileShell>
      <PageHeader eyebrow="Con cái" title={pageTitle} back="/con-cai" />
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
          {type === "child" && (
            <>
              <FormField label="Tên *">
                <FormTextInput value={(form.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label="Ngày sinh"
                  value={(form.dob as string) ?? ""}
                  onChange={(e) => set("dob", e.target.value)}
                />
                <FormField label="Emoji">
                  <FormTextInput
                    placeholder="🧒"
                    maxLength={4}
                    value={(form.avatar as string) ?? ""}
                    onChange={(e) => set("avatar", e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Trường">
                <FormTextInput value={(form.school as string) ?? ""} onChange={(e) => set("school", e.target.value)} />
              </FormField>
              <FormField label="Lớp">
                <FormTextInput value={(form.grade as string) ?? ""} onChange={(e) => set("grade", e.target.value)} />
              </FormField>
              <FormField label="Ghi chú">
                <FormTextarea rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </FormField>
            </>
          )}
          {(type === "schedule" || type === "homework" || type === "achievement") && children.length > 0 && (
            <InlineSelect
              label="Con *"
              value={(form.child_id as string) ?? ""}
              onChange={(v) => set("child_id", v)}
              options={childOptions}
            />
          )}
          {type === "schedule" && (
            <>
              <InlineSelect
                label="Thứ *"
                value={String(form.day_of_week ?? 1)}
                onChange={(v) => set("day_of_week", Number(v))}
                options={dayOptions}
              />
              <FormField label="Môn *">
                <FormTextInput value={(form.subject as string) ?? ""} onChange={(e) => set("subject", e.target.value)} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Bắt đầu">
                  <FormTextInput
                    placeholder="08:00"
                    value={(form.time_start as string) ?? ""}
                    onChange={(e) => set("time_start", e.target.value)}
                  />
                </FormField>
                <FormField label="Kết thúc">
                  <FormTextInput
                    placeholder="09:00"
                    value={(form.time_end as string) ?? ""}
                    onChange={(e) => set("time_end", e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Phòng">
                <FormTextInput value={(form.room as string) ?? ""} onChange={(e) => set("room", e.target.value)} />
              </FormField>
            </>
          )}
          {type === "homework" && (
            <>
              <FormField label="Môn *">
                <FormTextInput value={(form.subject as string) ?? ""} onChange={(e) => set("subject", e.target.value)} />
              </FormField>
              <FormField label="Nội dung *">
                <FormTextInput value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} />
              </FormField>
              <DateField
                label="Hạn nộp"
                value={(form.due_date as string) ?? ""}
                onChange={(e) => set("due_date", e.target.value)}
              />
              <FormField label="Ghi chú">
                <FormTextarea rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </FormField>
            </>
          )}
          {type === "achievement" && (
            <>
              <FormField label="Tiêu đề *">
                <FormTextInput value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} />
              </FormField>
              <FormField label="Loại">
                <FormTextInput
                  placeholder="Học tập / Thể thao…"
                  value={(form.kind as string) ?? ""}
                  onChange={(e) => set("kind", e.target.value)}
                />
              </FormField>
              <DateField
                label="Ngày"
                value={(form.earned_at as string) ?? ""}
                onChange={(e) => set("earned_at", e.target.value)}
              />
              <FormField label="Ghi chú">
                <FormTextarea rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </FormField>
            </>
          )}
          {type === "reminder" && (
            <>
              <InlineSelect
                label="Liên quan đến"
                value={(form.child_id as string) ?? ""}
                onChange={(v) => set("child_id", v || null)}
                options={reminderChildOptions}
              />
              <FormField label="Nội dung *">
                <FormTextInput value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} />
              </FormField>
              <DateField
                label="Nhắc lúc *"
                type="datetime-local"
                value={form.remind_at ? toLocalInput(form.remind_at as string) : ""}
                onChange={(e) => set("remind_at", e.target.value)}
              />
              <FormField label="Ghi chú">
                <FormTextarea rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </FormField>
            </>
          )}
        </FormScreen>
      </form>
    </MobileShell>
  );
}
