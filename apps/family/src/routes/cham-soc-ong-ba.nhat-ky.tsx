import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Pill, NotebookPen, Activity } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { useFamilyContext } from "@/hooks/use-family-context";
import { useAuth } from "@shared/ui/hooks/use-auth";
import {
  listElderlyProfiles,
  listCareTimeline,
  type ActivityRow,
} from "@/api/elderly-care";
import { cn } from "@shared/utils";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/cham-soc-ong-ba/nhat-ky")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({
    meta: [
      { title: "Nhật ký chăm sóc — STOS Life" },
      {
        name: "description",
        content:
          "Nhật ký tổng hợp 7 hoặc 30 ngày: Safe Check, ghi chú và thuốc đã uống của ông bà.",
      },
    ],
  }),
  component: CareTimelinePage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const kindStyle: Record<ActivityRow["kind"], { bg: string; icon: any; label: string }> = {
  check: { bg: "bg-tint-green text-success", icon: ShieldCheck, label: "Safe Check" },
  med: { bg: "bg-tint-blue text-primary", icon: Pill, label: "Thuốc" },
  note: { bg: "bg-tint-orange text-warning", icon: NotebookPen, label: "Ghi chú" },
  vital: { bg: "bg-tint-purple text-accent", icon: Activity, label: "Sinh hiệu" },
};

function CareTimelinePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const [days, setDays] = useState<7 | 30>(7);

  if (!session && !famLoading) {
    navigate({ to: "/login", search: { redirect: "/cham-soc-ong-ba/nhat-ky" } });
  }

    const profilesQ = useQuery({
    queryKey: ["elderly-profiles", familyId],
    queryFn: () => listElderlyProfiles({ familyId: familyId! }),
    enabled: !!familyId,
  });
  const profiles = profilesQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const profile = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? profiles[0] ?? null,
    [profiles, selectedId],
  );

    const timelineQ = useQuery({
    queryKey: ["care-timeline", profile?.id, days],
    queryFn: () =>
      listCareTimeline({
          elderlyId: profile!.id,
          familyId: familyId!,
          memberName: profile!.name,
          days,
      }),
    enabled: !!profile && !!familyId,
    refetchInterval: 60_000,
  });

  const rows = timelineQ.data ?? [];

  // Group by day
  const groups = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const r of rows) {
      const key = new Date(r.at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const counts = useMemo(() => {
    const c = { check: 0, med: 0, note: 0, vital: 0 };
    for (const r of rows) c[r.kind]++;
    return c;
  }, [rows]);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Chăm sóc ông bà"
        title="Nhật ký chăm sóc"
        subtitle="Tổng hợp Safe Check, ghi chú và thuốc đã uống"
        emoji="📒"
        back="/cham-soc-ong-ba"
      />

      <div className="px-4 space-y-4 pb-24">
        {/* Profile chips */}
        {profiles.length > 1 && (
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 no-scrollbar">
            {profiles.map((p) => {
              const active = p.id === profile?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "shrink-0 px-3 py-2 rounded-full text-sm border transition",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-foreground",
                  )}
                >
                  <span className="mr-1">{p.avatar ?? "👵"}</span>
                  {p.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Range tabs */}
        <div className="grid grid-cols-2 gap-2">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "py-2.5 rounded-xl text-sm font-medium border transition",
                days === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground",
              )}
            >
              {d} ngày gần đây
            </button>
          ))}
        </div>

        {/* Summary */}
        <RoundedCard className="p-4">
          <SectionHeader title="Tổng quan" subtitle={`${rows.length} hoạt động trong ${days} ngày`} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <SummaryStat label="Safe Check" value={counts.check} tone="bg-tint-green text-success" />
            <SummaryStat label="Thuốc đã uống" value={counts.med} tone="bg-tint-blue text-primary" />
            <SummaryStat label="Ghi chú" value={counts.note} tone="bg-tint-orange text-warning" />
          </div>
        </RoundedCard>

        {/* Timeline */}
        {!profile ? (
          <RoundedCard className="p-6 text-center text-muted-foreground">
            Chưa có hồ sơ ông/bà. Thêm hồ sơ ở màn Chăm sóc ông bà.
          </RoundedCard>
        ) : timelineQ.isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải nhật ký…
          </div>
        ) : groups.length === 0 ? (
          <RoundedCard className="p-6 text-center text-muted-foreground">
            Chưa có hoạt động nào trong {days} ngày qua.
          </RoundedCard>
        ) : (
          <div className="space-y-4">
            {groups.map(([day, items]) => (
              <div key={day}>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  {fmtDate(day + "T00:00:00")} · {items.length} hoạt động
                </div>
                <RoundedCard className="p-0 overflow-hidden">
                  <ul className="divide-y divide-border">
                    {items.map((r) => {
                      const s = kindStyle[r.kind];
                      const Icon = s.icon;
                      return (
                        <li key={r.id} className="p-3 flex gap-3">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                              s.bg,
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {r.title}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {fmtTime(r.at)}
                              </span>
                            </div>
                            {r.detail && (
                              <p className="text-sm text-muted-foreground mt-0.5 break-words">
                                {r.detail}
                              </p>
                            )}
                            {r.meta?.author && (
                              <p className="text-xs text-muted-foreground mt-1">
                                — {r.meta.author}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </RoundedCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn("rounded-xl p-3 text-center", tone)}>
      <div className="text-2xl font-semibold leading-none">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  );
}
