import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Sparkles, Pencil, Trash2, Bell, MapPin } from "lucide-react";
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
import { cn } from "@shared/utils";
import {
  listFamilyEvents,
  upsertFamilyEvent,
  deleteFamilyEvent,
  type FamilyEventRow,
  type EventCategory,
  type EventScope,
} from "@/api/family-events";

export const Route = createFileRoute("/lich-gia-dinh")({
  head: () => ({
    meta: [
      { title: "Lịch gia đình — STOS Life" },
      { name: "description", content: "Lịch chung của cả gia đình: học tập, sức khỏe, thanh toán, du lịch." },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.pathname } });
  },
  component: CalendarPage,
});

// ============ Constants ============
const CATS: { id: EventCategory; label: string; icon: string; tint: string; accent: string }[] = [
  { id: "school", label: "Học tập", icon: "🎒", tint: "bg-tint-purple", accent: "text-pink" },
  { id: "medical", label: "Y tế", icon: "🏥", tint: "bg-tint-red", accent: "text-emergency" },
  { id: "medication", label: "Thuốc", icon: "💊", tint: "bg-tint-green", accent: "text-success" },
  { id: "travel", label: "Du lịch", icon: "✈️", tint: "bg-tint-orange", accent: "text-warning" },
  { id: "family", label: "Gia đình", icon: "👨‍👩‍👧", tint: "bg-tint-pink", accent: "text-pink" },
  { id: "payment", label: "Thanh toán", icon: "💳", tint: "bg-tint-blue", accent: "text-brand" },
];
const catMap = Object.fromEntries(CATS.map((c) => [c.id, c]));

const SCOPES: { id: "all" | EventScope; label: string }[] = [
  { id: "all", label: "Cả nhà" },
  { id: "children", label: "Con cái" },
  { id: "elderly", label: "Ông bà" },
  { id: "health", label: "Sức khỏe" },
  { id: "travel", label: "Du lịch" },
];

// ============ Mock fallback (khi backend rỗng) ============
const todayISO = new Date().toISOString().slice(0, 10);
const at = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const MOCK_EVENTS: FamilyEventRow[] = [
  { id: "m1", family_id: "mock", title: "Ông Nội uống thuốc huyết áp", notes: null, category: "medication", member_scope: "elderly", member_name: "Ông Nội", starts_at: at(7), ends_at: null, all_day: false, location: null, remind_minutes_before: 10, status: "planned" },
  { id: "m2", family_id: "mock", title: "Bé Minh đi học", notes: null, category: "school", member_scope: "children", member_name: "Bé Minh", starts_at: at(8), ends_at: null, all_day: false, location: "Trường Tiểu học Nguyễn Du", remind_minutes_before: 15, status: "planned" },
  { id: "m3", family_id: "mock", title: "Bé An học Piano", notes: null, category: "school", member_scope: "children", member_name: "Bé An", starts_at: at(17, 30), ends_at: null, all_day: false, location: "Lớp Piano cô Hà", remind_minutes_before: 30, status: "planned" },
  { id: "m4", family_id: "mock", title: "Thanh toán hóa đơn điện", notes: "Tháng 5/2026", category: "payment", member_scope: "all", member_name: null, starts_at: at(20), ends_at: null, all_day: false, location: null, remind_minutes_before: 60, status: "planned" },
];

// ============ Helpers ============
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const fmtDayLabel = (d: Date) =>
  d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function startOfWeek(d: Date) {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7; // Mon=0
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - day);
  return c;
}

// ============ Page ============
type DialogState = { row?: FamilyEventRow } | null;

function CalendarPage() {
  const { familyId, isLoading: famLoading } = useFamilyContext();
      const qc = useQueryClient();

  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dlg, setDlg] = useState<DialogState>(null);

  const q = useQuery({
    queryKey: ["family-events", familyId],
    queryFn: () => listFamilyEvents({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const events: FamilyEventRow[] = q.data ?? MOCK_EVENTS;
  const isMock = !familyId;

  const filteredEvents = useMemo(
    () =>
      scope === "all"
        ? events
        : events.filter(
            (e) => e.member_scope === scope || (scope === "health" && e.category === "medical"),
          ),
    [events, scope],
  );

  const week = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const dayEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => isSameDay(new Date(e.starts_at), selectedDate))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [filteredEvents, selectedDate],
  );

  const weekCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredEvents) {
      const k = new Date(e.starts_at).toDateString();
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [filteredEvents]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFamilyEvent({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-events", familyId] });
      toast.success("Đã xoá sự kiện");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Render shell even without familyId (mock fallback); famLoading is informational only.

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Lịch gia đình"
        subtitle="Mọi lịch trình của cả nhà trong một nơi"
        emoji="📅"
        right={
          <button
            onClick={() => setDlg({})}
            disabled={isMock}
            className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center shadow-[var(--shadow-soft)] disabled:opacity-40"
            aria-label="Thêm sự kiện"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      {/* AI Daily Briefing */}
      <section className="px-4 mt-2">
        <RoundedCard className="bg-gradient-to-br from-brand/10 to-pink/10 border-0 flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white grid place-items-center shrink-0">
            <Sparkles className="h-5 w-5 text-pink" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-pink">
              Trợ lý AI · Tóm tắt hôm nay
            </p>
            <p className="text-sm font-medium leading-snug mt-1">
              Hôm nay có <b>{dayEvents.length}</b> sự kiện. Đừng quên nhắc Ông Nội uống thuốc lúc 7:00 và thanh toán hoá đơn điện trước 20:00.
            </p>
          </div>
        </RoundedCard>
      </section>

      {/* Filter chips */}
      <section className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={cn(
                "shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold border transition",
                scope === s.id
                  ? "bg-brand text-white border-brand"
                  : "bg-card text-foreground border-border",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Weekly strip */}
      <section className="px-4 mt-4">
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const active = isSameDay(d, selectedDate);
            const today = isSameDay(d, new Date());
            const count = weekCounts.get(d.toDateString()) ?? 0;
            const wd = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][(d.getDay() + 6) % 7];
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "flex flex-col items-center py-2 rounded-2xl border transition",
                  active
                    ? "bg-brand text-white border-brand"
                    : today
                      ? "bg-tint-blue border-brand/30"
                      : "bg-card border-border",
                )}
              >
                <span className={cn("text-[10px] font-medium", active ? "text-white/80" : "text-muted-foreground")}>
                  {wd}
                </span>
                <span className="text-base font-bold leading-tight">{d.getDate()}</span>
                <span
                  className={cn(
                    "mt-0.5 h-1.5 w-1.5 rounded-full",
                    count > 0 ? (active ? "bg-white" : "bg-brand") : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily timeline */}
      <section className="px-4 mt-6">
        <SectionHeader
          title={fmtDayLabel(selectedDate)}
          subtitle={`${dayEvents.length} sự kiện`}
        />

        {q.isLoading && <LoadingState />}
        {q.error && <ErrorState message={(q.error as Error).message} />}

        {!q.isLoading && !q.error && dayEvents.length === 0 && (
          <EmptyState
            title="Chưa có sự kiện"
            description="Thêm sự kiện đầu tiên cho ngày này"
            action={
              <Button onClick={() => setDlg({})} disabled={isMock} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Thêm sự kiện
              </Button>
            }
          />
        )}

        {dayEvents.length > 0 && (
          <RoundedCard className="p-0 overflow-hidden">
            {dayEvents.map((e, i) => {
              const cat = catMap[e.category] ?? catMap.family;
              return (
                <div
                  key={e.id}
                  className={cn("flex gap-3 p-4", i > 0 && "border-t border-border")}
                >
                  {/* Time rail */}
                  <div className="w-12 shrink-0 text-right">
                    <p className={cn("text-sm font-bold", cat.accent)}>{fmtTime(e.starts_at)}</p>
                    {e.remind_minutes_before != null && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-0.5">
                        <Bell className="h-2.5 w-2.5" />
                        {e.remind_minutes_before}'
                      </p>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2.5">
                      <div className={cn("h-10 w-10 rounded-2xl grid place-items-center text-lg shrink-0", cat.tint)}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug">{e.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {cat.label}
                          {e.member_name ? ` · ${e.member_name}` : ""}
                        </p>
                        {e.location && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {e.location}
                          </p>
                        )}
                      </div>
                      {!isMock && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setDlg({ row: e })}
                            className="h-8 w-8 rounded-xl bg-muted grid place-items-center"
                            aria-label="Sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Xoá sự kiện này?")) delMut.mutate(e.id);
                            }}
                            className="h-8 w-8 rounded-xl bg-muted grid place-items-center text-emergency"
                            aria-label="Xoá"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </RoundedCard>
        )}

        {isMock && (
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Đang xem dữ liệu mẫu — thêm sự kiện thật khi gia đình của bạn được khởi tạo.
          </p>
        )}
      </section>

      {/* Dialog */}
      {dlg && familyId && (
        <EventDialog
          row={dlg.row}
          familyId={familyId}
          defaultDate={selectedDate}
          onClose={() => setDlg(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["family-events", familyId] });
            setDlg(null);
          }}
        />
      )}
    </MobileShell>
  );
}

// ============ Dialog ============
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventDialog({
  row,
  familyId,
  defaultDate,
  onClose,
  onSaved,
}: {
  row?: FamilyEventRow;
  familyId: string;
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
    const def = new Date(defaultDate);
  def.setHours(9, 0, 0, 0);

  const [title, setTitle] = useState(row?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(row?.category ?? "family");
  const [scope, setScope] = useState<EventScope>(row?.member_scope ?? "all");
  const [memberName, setMemberName] = useState(row?.member_name ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(row?.starts_at ?? def.toISOString()));
  const [location, setLocation] = useState(row?.location ?? "");
  const [remind, setRemind] = useState<string>(
    row?.remind_minutes_before != null ? String(row.remind_minutes_before) : "",
  );
  const [notes, setNotes] = useState(row?.notes ?? "");

  const mut = useMutation({
    mutationFn: () =>
      upsertFamilyEvent({
          id: row?.id,
          family_id: familyId,
          title,
          category,
          member_scope: scope,
          member_name: memberName || null,
          starts_at: new Date(startsAt).toISOString(),
          location: location || null,
          remind_minutes_before: remind ? Number(remind) : null,
          notes: notes || null,
          all_day: false
    }),
    onSuccess: () => {
      toast.success(row ? "Đã cập nhật" : "Đã thêm sự kiện");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{row ? "Sửa sự kiện" : "Thêm sự kiện"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bé Minh đi học" />
          </div>
          <div>
            <Label>Loại sự kiện</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "h-14 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5",
                    category === c.id ? "border-brand bg-tint-blue" : "border-border bg-card",
                  )}
                >
                  <span className="text-base">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Thành viên</Label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as EventScope)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm"
              >
                {SCOPES.filter((s) => s.id !== "all").map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
                <option value="all">Cả nhà</option>
              </select>
            </div>
            <div>
              <Label>Tên (tuỳ chọn)</Label>
              <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Bé Minh" />
            </div>
          </div>
          <div>
            <Label>Bắt đầu</Label>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Địa điểm</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Trường..." />
            </div>
            <div>
              <Label>Nhắc trước (phút)</Label>
              <Input type="number" value={remind} onChange={(e) => setRemind(e.target.value)} placeholder="15" min={0} />
            </div>
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button onClick={() => mut.mutate()} disabled={!title || mut.isPending}>
            {mut.isPending ? "Đang lưu…" : row ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
