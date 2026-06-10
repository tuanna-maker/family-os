import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, GraduationCap, BookOpen, Trophy, Bell, CalendarClock } from "lucide-react";
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
  listChildren,
  upsertChild,
  upsertSchedule,
  upsertHomework,
  upsertAchievement,
  upsertParentReminder,
  toggleHomework,
  toggleReminder,
  deleteChildrenRow,
} from "@/lib/children.functions";

export const Route = createFileRoute("/con-cai")({
  head: () => ({ meta: [{ title: "Đồng hành cùng con — STOS Life" }] }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: ChildrenPage,
});

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

type Dlg =
  | { type: "child"; row?: any }
  | { type: "schedule"; row?: any; childId?: string }
  | { type: "homework"; row?: any; childId?: string }
  | { type: "achievement"; row?: any; childId?: string }
  | { type: "reminder"; row?: any }
  | null;

function ChildrenPage() {
  const { familyId } = useFamilyContext();
  const list = useServerFn(listChildren);
  const tgHw = useServerFn(toggleHomework);
  const tgRm = useServerFn(toggleReminder);
  const del = useServerFn(deleteChildrenRow);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => list({ data: { family_id: familyId! } }),
    enabled: !!familyId,
  });

  const [dlg, setDlg] = useState<Dlg>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["children", familyId] });

  const delMut = useMutation({
    mutationFn: (v: { table: any; id: string }) => del({ data: v }),
    onSuccess: () => { toast.success("Đã xoá"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const hwMut = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => tgHw({ data: v }),
    onSuccess: invalidate,
  });
  const rmMut = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => tgRm({ data: v }),
    onSuccess: invalidate,
  });

  const activeChildId = useMemo(() => {
    if (!q.data) return null;
    if (selectedChild && q.data.children.some((c) => c.id === selectedChild)) return selectedChild;
    return q.data.children[0]?.id ?? null;
  }, [q.data, selectedChild]);

  const childMap = useMemo(() => {
    const m = new Map<string, string>();
    (q.data?.children ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [q.data]);

  return (
    <MobileShell>
      <PageHeader eyebrow="Family Core" title="Đồng hành cùng con" subtitle={q.data ? `${q.data.children.length} bé` : ""} emoji="🎒" />

      {q.isLoading && <section className="px-4"><LoadingState /></section>}
      {q.isError && <section className="px-4"><ErrorState message={(q.error as Error).message} /></section>}

      {q.data && (
        <>
          {/* CHILDREN */}
          <section className="px-4 mt-2">
            <SectionHeader title="Các con" action={<AddBtn onClick={() => setDlg({ type: "child" })} />} />
            {q.data.children.length === 0 ? (
              <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="Chưa có hồ sơ con" description="Thêm bé để bắt đầu theo dõi" />
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {q.data.children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChild(c.id)}
                    className={`shrink-0 flex flex-col items-center gap-1 p-3 rounded-2xl border min-w-[90px] ${activeChildId === c.id ? "bg-brand text-white border-brand" : "bg-card border-border"}`}
                  >
                    <span className="text-2xl">{c.avatar || "🧒"}</span>
                    <span className="text-xs font-semibold truncate max-w-[80px]">{c.name}</span>
                    <span className={`text-[10px] ${activeChildId === c.id ? "text-white/80" : "text-muted-foreground"} truncate max-w-[80px]`}>{c.grade || c.school || "—"}</span>
                  </button>
                ))}
              </div>
            )}
            {activeChildId && (
              <div className="mt-2 flex justify-end gap-1">
                <button onClick={() => setDlg({ type: "child", row: q.data.children.find((c) => c.id === activeChildId) })} className="text-[11px] text-brand">Sửa hồ sơ</button>
                <span className="text-[11px] text-muted-foreground">·</span>
                <button onClick={() => delMut.mutate({ table: "children", id: activeChildId })} className="text-[11px] text-destructive">Xoá</button>
              </div>
            )}
          </section>

          {/* SCHEDULE */}
          {activeChildId && (
            <section className="px-4 mt-5">
              <SectionHeader
                title="Thời khoá biểu"
                action={<AddBtn onClick={() => setDlg({ type: "schedule", childId: activeChildId })} />}
              />
              {(() => {
                const items = q.data.schedules.filter((s) => s.child_id === activeChildId);
                if (items.length === 0) return <EmptyState icon={<BookOpen className="h-5 w-5" />} title="Chưa có lịch học" />;
                const byDay: Record<number, typeof items> = {};
                items.forEach((s) => {
                  byDay[s.day_of_week] = [...(byDay[s.day_of_week] ?? []), s];
                });
                return (
                  <div className="space-y-2">
                    {Object.keys(byDay).map(Number).sort().map((d) => (
                      <RoundedCard key={d} className="p-3">
                        <p className="text-xs font-bold text-brand mb-2">{DAYS[d]}</p>
                        <div className="space-y-1">
                          {byDay[d].map((s) => (
                            <div key={s.id} className="flex items-center gap-2 text-sm">
                              <span className="text-[11px] text-muted-foreground w-20 shrink-0">
                                {[s.time_start, s.time_end].filter(Boolean).join("–") || "—"}
                              </span>
                              <span className="flex-1 truncate">{s.subject}{s.room && <span className="text-muted-foreground"> · {s.room}</span>}</span>
                              <RowActions onEdit={() => setDlg({ type: "schedule", row: s })} onDelete={() => delMut.mutate({ table: "school_schedules", id: s.id })} />
                            </div>
                          ))}
                        </div>
                      </RoundedCard>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* HOMEWORK */}
          {activeChildId && (
            <section className="px-4 mt-6">
              <SectionHeader
                title="Bài tập về nhà"
                subtitle={`${q.data.homeworks.filter((h) => h.child_id === activeChildId && !h.done).length} chưa xong`}
                action={<AddBtn onClick={() => setDlg({ type: "homework", childId: activeChildId })} />}
              />
              {(() => {
                const items = q.data.homeworks.filter((h) => h.child_id === activeChildId);
                if (items.length === 0) return <EmptyState icon={<BookOpen className="h-5 w-5" />} title="Chưa có bài tập" />;
                return (
                  <RoundedCard className="p-0 divide-y divide-border">
                    {items.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={h.done}
                          onChange={(e) => hwMut.mutate({ id: h.id, done: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${h.done ? "line-through text-muted-foreground" : ""}`}>{h.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {h.subject}{h.due_date && ` • hạn ${h.due_date}`}
                          </p>
                        </div>
                        <RowActions onEdit={() => setDlg({ type: "homework", row: h })} onDelete={() => delMut.mutate({ table: "homeworks", id: h.id })} />
                      </div>
                    ))}
                  </RoundedCard>
                );
              })()}
            </section>
          )}

          {/* ACHIEVEMENTS */}
          {activeChildId && (
            <section className="px-4 mt-6">
              <SectionHeader
                title="Thành tích"
                action={<AddBtn onClick={() => setDlg({ type: "achievement", childId: activeChildId })} />}
              />
              {(() => {
                const items = q.data.achievements.filter((a) => a.child_id === activeChildId);
                if (items.length === 0) return <EmptyState icon={<Trophy className="h-5 w-5" />} title="Chưa có thành tích" />;
                return (
                  <div className="space-y-2">
                    {items.map((a) => (
                      <RoundedCard key={a.id} className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-tint-yellow grid place-items-center shrink-0">
                          <Trophy className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{a.kind || "Thành tích"} • {a.earned_at}</p>
                        </div>
                        <RowActions onEdit={() => setDlg({ type: "achievement", row: a })} onDelete={() => delMut.mutate({ table: "achievements", id: a.id })} />
                      </RoundedCard>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* PARENT REMINDERS */}
          <section className="px-4 mt-6">
            <SectionHeader title="Nhắc phụ huynh" action={<AddBtn onClick={() => setDlg({ type: "reminder" })} />} />
            {q.data.reminders.length === 0 ? (
              <EmptyState icon={<Bell className="h-5 w-5" />} title="Chưa có lời nhắc" />
            ) : (
              <RoundedCard className="p-0 divide-y divide-border">
                {q.data.reminders.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={r.done}
                      onChange={(e) => rmMut.mutate({ id: r.id, done: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${r.done ? "line-through text-muted-foreground" : ""}`}>{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        <CalendarClock className="h-3 w-3 inline" /> {new Date(r.remind_at).toLocaleString("vi-VN")}
                        {r.child_id && childMap.get(r.child_id) && ` • ${childMap.get(r.child_id)}`}
                      </p>
                    </div>
                    <RowActions onEdit={() => setDlg({ type: "reminder", row: r })} onDelete={() => delMut.mutate({ table: "parent_reminders", id: r.id })} />
                  </div>
                ))}
              </RoundedCard>
            )}
          </section>
        </>
      )}

      {dlg && familyId && (
        <ChildrenDialog
          state={dlg}
          familyId={familyId}
          children={q.data?.children ?? []}
          onClose={() => setDlg(null)}
          onSaved={() => { setDlg(null); invalidate(); }}
        />
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
      <button onClick={onEdit} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={onDelete} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function toLocalInput(iso: string) {
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function ChildrenDialog({
  state, familyId, children, onClose, onSaved,
}: { state: NonNullable<Dlg>; familyId: string; children: any[]; onClose: () => void; onSaved: () => void }) {
  const saveChild = useServerFn(upsertChild);
  const saveSched = useServerFn(upsertSchedule);
  const saveHw = useServerFn(upsertHomework);
  const saveAch = useServerFn(upsertAchievement);
  const saveRm = useServerFn(upsertParentReminder);

  const initialChild = (state as any).childId ?? state.row?.child_id ?? children[0]?.id;
  const [form, setForm] = useState<any>({ child_id: initialChild, ...(state.row ?? {}) });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const titles: Record<string, string> = {
    child: state.row ? "Sửa hồ sơ con" : "Thêm con",
    schedule: state.row ? "Sửa tiết học" : "Thêm tiết học",
    homework: state.row ? "Sửa bài tập" : "Thêm bài tập",
    achievement: state.row ? "Sửa thành tích" : "Thêm thành tích",
    reminder: state.row ? "Sửa nhắc" : "Thêm nhắc",
  };

  const mut = useMutation({
    mutationFn: async () => {
      const base = { ...form, family_id: familyId, id: state.row?.id ?? null };
      if (state.type === "child") return saveChild({ data: base });
      if (state.type === "schedule") return saveSched({ data: { ...base, day_of_week: Number(form.day_of_week ?? 1) } });
      if (state.type === "homework") return saveHw({ data: { ...base, done: form.done ?? false } });
      if (state.type === "achievement") return saveAch({ data: base });
      if (state.type === "reminder") {
        if (!form.remind_at) throw new Error("Chọn thời gian");
        return saveRm({ data: { ...base, remind_at: new Date(form.remind_at).toISOString(), done: form.done ?? false } });
      }
    },
    onSuccess: () => { toast.success("Đã lưu"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{titles[state.type]}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {state.type === "child" && (
            <>
              <FormField label="Tên *"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Ngày sinh"><Input type="date" value={form.dob ?? ""} onChange={(e) => set("dob", e.target.value)} /></FormField>
                <FormField label="Emoji"><Input placeholder="🧒" maxLength={4} value={form.avatar ?? ""} onChange={(e) => set("avatar", e.target.value)} /></FormField>
              </div>
              <FormField label="Trường"><Input value={form.school ?? ""} onChange={(e) => set("school", e.target.value)} /></FormField>
              <FormField label="Lớp"><Input value={form.grade ?? ""} onChange={(e) => set("grade", e.target.value)} /></FormField>
              <FormField label="Ghi chú"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
            </>
          )}
          {(state.type === "schedule" || state.type === "homework" || state.type === "achievement" || state.type === "reminder") && children.length > 0 && state.type !== "reminder" && (
            <FormField label="Con *">
              <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={form.child_id ?? ""} onChange={(e) => set("child_id", e.target.value)}>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
          )}
          {state.type === "schedule" && (
            <>
              <FormField label="Thứ *">
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={form.day_of_week ?? 1} onChange={(e) => set("day_of_week", Number(e.target.value))}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </FormField>
              <FormField label="Môn *"><Input value={form.subject ?? ""} onChange={(e) => set("subject", e.target.value)} /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Bắt đầu"><Input placeholder="08:00" value={form.time_start ?? ""} onChange={(e) => set("time_start", e.target.value)} /></FormField>
                <FormField label="Kết thúc"><Input placeholder="09:00" value={form.time_end ?? ""} onChange={(e) => set("time_end", e.target.value)} /></FormField>
              </div>
              <FormField label="Phòng"><Input value={form.room ?? ""} onChange={(e) => set("room", e.target.value)} /></FormField>
            </>
          )}
          {state.type === "homework" && (
            <>
              <FormField label="Môn *"><Input value={form.subject ?? ""} onChange={(e) => set("subject", e.target.value)} /></FormField>
              <FormField label="Nội dung *"><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></FormField>
              <FormField label="Hạn nộp"><Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} /></FormField>
              <FormField label="Ghi chú"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
            </>
          )}
          {state.type === "achievement" && (
            <>
              <FormField label="Tiêu đề *"><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></FormField>
              <FormField label="Loại"><Input placeholder="Học tập / Thể thao…" value={form.kind ?? ""} onChange={(e) => set("kind", e.target.value)} /></FormField>
              <FormField label="Ngày"><Input type="date" value={form.earned_at ?? ""} onChange={(e) => set("earned_at", e.target.value)} /></FormField>
              <FormField label="Ghi chú"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
            </>
          )}
          {state.type === "reminder" && (
            <>
              <FormField label="Liên quan đến">
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={form.child_id ?? ""} onChange={(e) => set("child_id", e.target.value || null)}>
                  <option value="">— Chung —</option>
                  {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Nội dung *"><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></FormField>
              <FormField label="Nhắc lúc *"><Input type="datetime-local" value={form.remind_at ? toLocalInput(form.remind_at) : ""} onChange={(e) => set("remind_at", e.target.value)} /></FormField>
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
