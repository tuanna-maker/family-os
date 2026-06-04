import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, GraduationCap, BookOpen, Trophy, Bell, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, ErrorState, EmptyState } from "@shared/ui/common/States";
import { supabase } from "@shared/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  listChildren,
  toggleHomework,
  toggleReminder,
  deleteChildrenRow,
} from "@/api/children";
import type { ChildFormType } from "@/features/family-core/children/child-form-page";

const CTX_STALE_MS = 5 * 60_000;
const DATA_STALE_MS = 60_000;

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

function ChildrenPage() {
  const { familyId, isLoading: isFamLoading } = useFamilyContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
    staleTime: DATA_STALE_MS,
  });

  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const goForm = (type: ChildFormType, opts?: { childId?: string; id?: string }) => {
    navigate({
      to: "/con-cai/them",
      search: {
        type,
        childId: opts?.childId,
        id: opts?.id,
      },
    });
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["children", familyId] });

  const delMut = useMutation({
    mutationFn: (v: { table: any; id: string }) => deleteChildrenRow(v),
    onSuccess: () => { toast.success("Đã xoá"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const hwMut = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => toggleHomework(v),
    onSuccess: invalidate,
  });
  const rmMut = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => toggleReminder(v),
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
      <PageHeader eyebrow="Family Core" title="Đồng hành cùng con" subtitle={q.data ? `${q.data.children.length} bé` : ""} emoji="🎒" back="/gia-dinh" />

      {(isFamLoading || q.isLoading) && <section className="px-4"><LoadingState /></section>}
      {q.isError && <section className="px-4"><ErrorState message={(q.error as Error).message} /></section>}
      {!isFamLoading && !familyId && <section className="px-4"><EmptyState title="Lỗi dữ liệu gia đình" description="Không tìm thấy thông tin gia đình của bạn." /></section>}

      {q.data && familyId && (
        <>
          {/* CHILDREN */}
          <section className="px-4 mt-2">
            <SectionHeader title="Các con" action={<AddBtn onClick={() => goForm("child")} />} />
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
                <button onClick={() => goForm("child", { id: activeChildId })} className="text-[11px] text-brand">Sửa hồ sơ</button>
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
                action={<AddBtn onClick={() => goForm("schedule", { childId: activeChildId! })} />}
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
                              <RowActions onEdit={() => goForm("schedule", { id: s.id })} onDelete={() => delMut.mutate({ table: "school_schedules", id: s.id })} />
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
                action={<AddBtn onClick={() => goForm("homework", { childId: activeChildId! })} />}
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
                        <RowActions onEdit={() => goForm("homework", { id: h.id })} onDelete={() => delMut.mutate({ table: "homeworks", id: h.id })} />
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
                action={<AddBtn onClick={() => goForm("achievement", { childId: activeChildId! })} />}
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
                        <RowActions onEdit={() => goForm("achievement", { id: a.id })} onDelete={() => delMut.mutate({ table: "achievements", id: a.id })} />
                      </RoundedCard>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* PARENT REMINDERS */}
          <section className="px-4 mt-6">
            <SectionHeader title="Nhắc phụ huynh" action={<AddBtn onClick={() => goForm("reminder")} />} />
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
                    <RowActions onEdit={() => goForm("reminder", { id: r.id })} onDelete={() => delMut.mutate({ table: "parent_reminders", id: r.id })} />
                  </div>
                ))}
              </RoundedCard>
            )}
          </section>
        </>
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
