import { createFileRoute, Link } from "@tanstack/react-router";
import { GuardMobileShell } from "@/components/guard/GuardMobileShell";
import { GroupedSection } from "@/components/guard/ios/GroupedCard";
import { ListRow } from "@/components/guard/ios/ListRow";
import {
  dutyKpis,
  guardProfile,
  guardTasks,
  patrolCheckpoints,
} from "@/features/guard-mobile/data";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptic";
import { Bell, Circle, MapPin, ScanLine, Siren } from "lucide-react";

export const Route = createFileRoute("/guard/")({
  head: () => ({ meta: [{ title: "Ca trực — STOS Guard" }] }),
  component: GuardDutyPage,
});

function GuardDutyPage() {
  const doneCp = patrolCheckpoints.filter((c) => c.done).length;
  const nextCp = patrolCheckpoints.find((c) => !c.done);

  return (
    <GuardMobileShell
      largeTitle={`Xin chào, ${guardProfile.name.split(" ").slice(-1).join(" ")}`}
      subtitle={`${guardProfile.zone} · ${guardProfile.shift}`}
      trailing={
        <Link
          to="/guard/tasks"
          className="relative h-10 w-10 rounded-full bg-card border border-border grid place-items-center active:scale-95 transition"
          aria-label="Thông báo nhiệm vụ"
        >
          <Bell className="h-[18px] w-[18px] text-foreground" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-emergency text-[9px] font-bold text-primary-foreground grid place-items-center">
            2
          </span>
        </Link>
      }
    >
      {/* Shift status card */}
      <section className="px-4 mt-2">
        <div className="rounded-[14px] bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-tint-green grid place-items-center text-success font-bold text-sm">
              {guardProfile.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-success flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Đang trực
              </p>
              <p className="text-[15px] font-semibold truncate">{guardProfile.zone}</p>
              <p className="text-[12px] text-muted-foreground">{guardProfile.project}</p>
            </div>
            <button
              type="button"
              onClick={() => hapticMedium()}
              className="text-[13px] font-semibold text-brand min-h-[44px] px-2 active:opacity-60"
            >
              Chấm công
            </button>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="px-4 mt-4 grid grid-cols-3 gap-2">
        {dutyKpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[14px] bg-card border border-border p-3 min-h-[72px] flex flex-col justify-between"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {k.label}
            </p>
            <p className="text-[20px] font-bold tabular-nums">{k.value}</p>
            <p
              className={cn(
                "text-[10px] font-medium",
                k.tone === "warning" && "text-warning",
                k.tone === "success" && "text-success",
                k.tone === "info" && "text-brand",
              )}
            >
              {k.sub}
            </p>
          </div>
        ))}
      </section>

      {/* Primary actions — 44pt+ targets */}
      <section className="px-4 mt-5 grid grid-cols-2 gap-3">
        <Link
          to="/guard/scan"
          onClick={() => hapticLight()}
          className="col-span-2 flex items-center gap-4 rounded-[14px] bg-brand text-primary-foreground p-4 min-h-[56px] active:scale-[0.98] transition shadow-[var(--shadow-soft)]"
        >
          <span className="h-11 w-11 rounded-xl bg-primary-foreground/15 grid place-items-center shrink-0">
            <ScanLine className="h-6 w-6" />
          </span>
          <span className="flex-1 text-left">
            <p className="text-[16px] font-bold">Quét QR khách / xe</p>
            <p className="text-[12px] opacity-80">Kiểm soát ra vào nhanh</p>
          </span>
        </Link>
        <Link
          to="/guard/patrol"
          className="flex flex-col gap-2 rounded-[14px] bg-card border border-border p-4 min-h-[88px] active:scale-[0.98] transition"
        >
          <MapPin className="h-5 w-5 text-brand" />
          <p className="text-[14px] font-semibold">Tuần tra</p>
          <p className="text-[11px] text-muted-foreground">
            {doneCp}/{patrolCheckpoints.length} checkpoint
          </p>
        </Link>
        <Link
          to="/guard/tasks"
          className="flex flex-col gap-2 rounded-[14px] bg-card border border-border p-4 min-h-[88px] active:scale-[0.98] transition"
        >
          <Siren className="h-5 w-5 text-emergency" />
          <p className="text-[14px] font-semibold">Sự cố / SOS</p>
          <p className="text-[11px] text-muted-foreground">2 đang mở</p>
        </Link>
      </section>

      {/* Next checkpoint */}
      {nextCp && (
        <GroupedSection title="Checkpoint kế tiếp" footer="Quét mã tại điểm để xác nhận tuần tra.">
          <ListRow
            title={nextCp.name}
            subtitle={`Hạn ${nextCp.due} · GPS ${nextCp.lat}`}
            value="Chưa quét"
            icon={<Circle className="h-4 w-4" />}
            iconBoxClassName="bg-tint-orange text-warning"
            to="/guard/patrol"
            showChevron
          />
        </GroupedSection>
      )}

      {/* Open tasks preview */}
      <GroupedSection title="Nhiệm vụ ưu tiên">
        {guardTasks.slice(0, 2).map((t) => (
          <ListRow
            key={t.id}
            title={t.title}
            subtitle={`${t.location} · ${t.ago}`}
            value={t.priority}
            icon={
              t.type === "SOS" ? (
                <Siren className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )
            }
            iconBoxClassName={
              t.priority === "P1" ? "bg-emergency text-primary-foreground" : "bg-tint-blue text-brand"
            }
            to="/guard/tasks"
          />
        ))}
        <ListRow title="Xem tất cả nhiệm vụ" to="/guard/tasks" showChevron />
      </GroupedSection>

      <div className="h-4" />
    </GuardMobileShell>
  );
}
