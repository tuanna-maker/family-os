import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Pencil, Pill, Stethoscope, FileHeart, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  listHealth,
  upsertHealthProfile,
  upsertMedicine,
  upsertAppointment,
  upsertHealthRecord,
  deleteHealthRow,
} from "@/lib/health.functions";

export const Route = createFileRoute("/suc-khoe/quan-ly")({
  head: () => ({ meta: [{ title: "Quản lý sức khỏe — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: HealthPage,
});

type DialogState =
  | { type: "profile"; row?: any }
  | { type: "medicine"; row?: any }
  | { type: "appt"; row?: any }
  | { type: "record"; row?: any }
  | null;

function HealthPage() {
  const { familyId, isLoading } = useFamilyContext();
  const list = useServerFn(listHealth);
  const del = useServerFn(deleteHealthRow);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["health", familyId],
    queryFn: () => list({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });

  const [dlg, setDlg] = useState<DialogState>(null);

  const delMut = useMutation({
    mutationFn: (v: { table: any; id: string }) => del({ data: v }),
    onSuccess: () => {
      toast.success("Đã xoá");
      qc.invalidateQueries({ queryKey: ["health", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["health", familyId] });

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" title="Sức khỏe gia đình" subtitle="Hồ sơ, nhắc thuốc, lịch khám" emoji="❤️" />

      {(isLoading || q.isLoading) && (
        <section className="px-4"><LoadingState /></section>
      )}
      {q.isError && (
        <section className="px-4"><ErrorState message={(q.error as Error).message} /></section>
      )}

      {q.data && (
        <>
          {/* PROFILES */}
          <section className="px-4 mt-4">
            <SectionHeader
              title="Hồ sơ sức khỏe"
              subtitle={`${q.data.profiles.length} thành viên`}
              action={<AddBtn onClick={() => setDlg({ type: "profile" })} />}
            />
            {q.data.profiles.length === 0 ? (
              <EmptyState icon={<UserCircle2 className="h-5 w-5" />} title="Chưa có hồ sơ" description="Thêm hồ sơ cho từng thành viên" />
            ) : (
              <div className="space-y-2">
                {q.data.profiles.map((p) => (
                  <RoundedCard key={p.id} className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-tint-blue grid place-items-center text-base shrink-0">
                      <UserCircle2 className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[p.blood_type && `Nhóm máu ${p.blood_type}`, p.dob && `Sinh ${p.dob}`].filter(Boolean).join(" • ") || "—"}
                      </p>
                      {p.allergies && <p className="text-[11px] text-muted-foreground mt-1 truncate">⚠️ Dị ứng: {p.allergies}</p>}
                      {p.conditions && <p className="text-[11px] text-muted-foreground truncate">📋 {p.conditions}</p>}
                    </div>
                    <RowActions onEdit={() => setDlg({ type: "profile", row: p })} onDelete={() => delMut.mutate({ table: "health_profiles", id: p.id })} />
                  </RoundedCard>
                ))}
              </div>
            )}
          </section>

          {/* MEDICINES */}
          <section className="px-4 mt-6">
            <SectionHeader
              title="Nhắc uống thuốc"
              subtitle={`${q.data.meds.filter((m) => m.active).length} đang dùng`}
              action={<AddBtn onClick={() => setDlg({ type: "medicine" })} />}
            />
            {q.data.meds.length === 0 ? (
              <EmptyState icon={<Pill className="h-5 w-5" />} title="Chưa có lời nhắc" />
            ) : (
              <div className="space-y-2">
                {q.data.meds.map((m) => (
                  <RoundedCard key={m.id} className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-tint-pink grid place-items-center shrink-0">
                      <Pill className="h-5 w-5 text-pink" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{m.medicine} {!m.active && <span className="text-[10px] text-muted-foreground">(tạm dừng)</span>}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.member_name} • {[m.dosage, m.time_of_day, m.days_of_week].filter(Boolean).join(" • ") || "—"}
                      </p>
                    </div>
                    <RowActions onEdit={() => setDlg({ type: "medicine", row: m })} onDelete={() => delMut.mutate({ table: "medicine_reminders", id: m.id })} />
                  </RoundedCard>
                ))}
              </div>
            )}
          </section>

          {/* APPOINTMENTS */}
          <section className="px-4 mt-6">
            <SectionHeader
              title="Lịch khám"
              subtitle={`${q.data.appts.filter((a) => a.status === "planned").length} sắp tới`}
              action={<AddBtn onClick={() => setDlg({ type: "appt" })} />}
            />
            {q.data.appts.length === 0 ? (
              <EmptyState icon={<Stethoscope className="h-5 w-5" />} title="Chưa có lịch khám" />
            ) : (
              <div className="space-y-2">
                {q.data.appts.map((a) => (
                  <RoundedCard key={a.id} className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-tint-blue grid place-items-center shrink-0">
                      <Stethoscope className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{a.member_name} — {a.doctor || "Khám tổng quát"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(a.scheduled_at).toLocaleString("vi-VN")} • {a.location || "—"}
                      </p>
                      <p className="text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full bg-muted">{a.status}</p>
                    </div>
                    <RowActions onEdit={() => setDlg({ type: "appt", row: a })} onDelete={() => delMut.mutate({ table: "medical_appointments", id: a.id })} />
                  </RoundedCard>
                ))}
              </div>
            )}
          </section>

          {/* RECORDS */}
          <section className="px-4 mt-6">
            <SectionHeader
              title="Bản ghi sức khỏe"
              subtitle={`${q.data.records.length} mục`}
              action={<AddBtn onClick={() => setDlg({ type: "record" })} />}
            />
            {q.data.records.length === 0 ? (
              <EmptyState icon={<FileHeart className="h-5 w-5" />} title="Chưa có bản ghi" description="Cân nặng, huyết áp, đường huyết…" />
            ) : (
              <RoundedCard className="p-0 divide-y divide-border">
                {q.data.records.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.title} {r.value && <span className="text-brand">— {r.value}</span>}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.member_name} • {r.kind} • {new Date(r.recorded_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <RowActions onEdit={() => setDlg({ type: "record", row: r })} onDelete={() => delMut.mutate({ table: "health_records", id: r.id })} />
                  </div>
                ))}
              </RoundedCard>
            )}
          </section>
        </>
      )}

      {/* DIALOGS */}
      {dlg && familyId && (
        <HealthDialog state={dlg} familyId={familyId} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); invalidate(); }} />
      )}
    </MobileShell>
  );
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
      <button onClick={onEdit} className="h-8 w-8 grid place-items-center rounded-xl hover:bg-muted">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} className="h-8 w-8 grid place-items-center rounded-xl hover:bg-destructive/10 text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------- Dialog ----------------
function HealthDialog({
  state,
  familyId,
  onClose,
  onSaved,
}: {
  state: NonNullable<DialogState>;
  familyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const saveProfile = useServerFn(upsertHealthProfile);
  const saveMed = useServerFn(upsertMedicine);
  const saveAppt = useServerFn(upsertAppointment);
  const saveRec = useServerFn(upsertHealthRecord);

  const [form, setForm] = useState<any>(state.row ?? {});
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const titles: Record<string, string> = {
    profile: state.row ? "Sửa hồ sơ" : "Thêm hồ sơ sức khỏe",
    medicine: state.row ? "Sửa nhắc thuốc" : "Thêm nhắc thuốc",
    appt: state.row ? "Sửa lịch khám" : "Thêm lịch khám",
    record: state.row ? "Sửa bản ghi" : "Thêm bản ghi sức khỏe",
  };

  const mut = useMutation({
    mutationFn: async () => {
      const base = { ...form, family_id: familyId, id: state.row?.id ?? null };
      if (state.type === "profile") return saveProfile({ data: base });
      if (state.type === "medicine") return saveMed({ data: { ...base, active: form.active ?? true } });
      if (state.type === "appt") {
        if (!form.scheduled_at) throw new Error("Vui lòng chọn thời gian");
        return saveAppt({ data: { ...base, scheduled_at: new Date(form.scheduled_at).toISOString(), status: form.status ?? "planned" } });
      }
      return saveRec({ data: { ...base, recorded_at: form.recorded_at ? new Date(form.recorded_at).toISOString() : undefined } });
    },
    onSuccess: () => { toast.success("Đã lưu"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{titles[state.type]}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {state.type === "profile" && (
            <>
              <FormField label="Tên *"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Ngày sinh"><Input type="date" value={form.dob ?? ""} onChange={(e) => set("dob", e.target.value)} /></FormField>
                <FormField label="Nhóm máu"><Input value={form.blood_type ?? ""} onChange={(e) => set("blood_type", e.target.value)} /></FormField>
              </div>
              <FormField label="Dị ứng"><Input value={form.allergies ?? ""} onChange={(e) => set("allergies", e.target.value)} /></FormField>
              <FormField label="Bệnh nền"><Input value={form.conditions ?? ""} onChange={(e) => set("conditions", e.target.value)} /></FormField>
              <FormField label="Ghi chú"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
            </>
          )}
          {state.type === "medicine" && (
            <>
              <FormField label="Thành viên *"><Input value={form.member_name ?? ""} onChange={(e) => set("member_name", e.target.value)} /></FormField>
              <FormField label="Tên thuốc *"><Input value={form.medicine ?? ""} onChange={(e) => set("medicine", e.target.value)} /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Liều dùng"><Input placeholder="1 viên" value={form.dosage ?? ""} onChange={(e) => set("dosage", e.target.value)} /></FormField>
                <FormField label="Giờ uống"><Input placeholder="08:00, 20:00" value={form.time_of_day ?? ""} onChange={(e) => set("time_of_day", e.target.value)} /></FormField>
              </div>
              <FormField label="Các ngày"><Input placeholder="T2,T4,T6 hoặc hằng ngày" value={form.days_of_week ?? ""} onChange={(e) => set("days_of_week", e.target.value)} /></FormField>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active ?? true} onChange={(e) => set("active", e.target.checked)} />
                Đang dùng
              </label>
            </>
          )}
          {state.type === "appt" && (
            <>
              <FormField label="Thành viên *"><Input value={form.member_name ?? ""} onChange={(e) => set("member_name", e.target.value)} /></FormField>
              <FormField label="Bác sĩ"><Input value={form.doctor ?? ""} onChange={(e) => set("doctor", e.target.value)} /></FormField>
              <FormField label="Địa điểm"><Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} /></FormField>
              <FormField label="Thời gian *">
                <Input type="datetime-local" value={form.scheduled_at ? toLocalInput(form.scheduled_at) : ""} onChange={(e) => set("scheduled_at", e.target.value)} />
              </FormField>
              <FormField label="Trạng thái">
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={form.status ?? "planned"} onChange={(e) => set("status", e.target.value)}>
                  <option value="planned">Đã lên lịch</option>
                  <option value="done">Đã khám</option>
                  <option value="cancelled">Đã huỷ</option>
                </select>
              </FormField>
              <FormField label="Ghi chú"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
            </>
          )}
          {state.type === "record" && (
            <>
              <FormField label="Thành viên *"><Input value={form.member_name ?? ""} onChange={(e) => set("member_name", e.target.value)} /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Loại *">
                  <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={form.kind ?? ""} onChange={(e) => set("kind", e.target.value)}>
                    <option value="">— Chọn —</option>
                    <option value="weight">Cân nặng</option>
                    <option value="height">Chiều cao</option>
                    <option value="blood_pressure">Huyết áp</option>
                    <option value="glucose">Đường huyết</option>
                    <option value="temperature">Nhiệt độ</option>
                    <option value="note">Khác</option>
                  </select>
                </FormField>
                <FormField label="Giá trị"><Input placeholder="vd: 68 kg" value={form.value ?? ""} onChange={(e) => set("value", e.target.value)} /></FormField>
              </div>
              <FormField label="Tiêu đề *"><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></FormField>
              <FormField label="Thời gian"><Input type="datetime-local" value={form.recorded_at ? toLocalInput(form.recorded_at) : ""} onChange={(e) => set("recorded_at", e.target.value)} /></FormField>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
