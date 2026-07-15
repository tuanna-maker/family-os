import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Sparkles, Pencil, Trash2, Bell, MapPin } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, ErrorState, EmptyState } from "@shared/ui/common/States";
import { Button } from "@shared/ui/ui/button";
import { supabase } from "@shared/supabase/client";
import { useFamilyContext } from "@/hooks/use-family-context";
import { cn } from "@shared/utils";
import {
  listFamilyEvents,
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

function CalendarPage() {
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const goAddEvent = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
    navigate({ to: "/lich-gia-dinh/them", search: { date } });
  };

  const q = useQuery({
    queryKey: ["family-events", familyId],
    queryFn: () => listFamilyEvents({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const events: FamilyEventRow[] = q.data ?? [];

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

  const briefingText = useMemo(() => {
    if (dayEvents.length === 0) return "Hôm nay chưa có sự kiện nào — thêm lịch mới cho cả nhà.";
    const first = dayEvents.slice(0, 2).map((e) => `${fmtTime(e.starts_at)} ${e.title}`).join("; ");
    const more = dayEvents.length > 2 ? ` và ${dayEvents.length - 2} việc khác` : "";
    return `Hôm nay có ${dayEvents.length} sự kiện: ${first}${more}.`;
  }, [dayEvents]);

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

  // Render shell even without familyId; famLoading is informational only.

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Lịch gia đình"
        subtitle="Mọi lịch trình của cả nhà trong một nơi"
        emoji="📅"
        back="/gia-dinh"
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
            <p className="text-sm font-medium leading-snug mt-1">{briefingText}</p>
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
              <Button onClick={goAddEvent} size="sm">
                Thêm sự kiện
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
                      {familyId && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => navigate({ to: "/lich-gia-dinh/sua/$eventId", params: { eventId: e.id } })}
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

      </section>
    </MobileShell>
  );
}
