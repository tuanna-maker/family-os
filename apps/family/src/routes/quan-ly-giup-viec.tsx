import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Phone,
  Plus,
  ShieldCheck,
  QrCode,
  Package,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Star,
  Activity,
} from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import {
  helpers,
  helperTasks,
  attendance,
  payments,
  workSchedule,
  defaultPermissions,
  helperActivity,
  type HelperPermission,
  type HelperTask,
} from "@/features/family-core/helper-management";
import { formatVND } from "@shared/utils/formatters";
import { cn } from "@shared/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/quan-ly-giup-viec")({
  head: () => ({
    meta: [
      { title: "Quản lý giúp việc — STOS Life" },
      {
        name: "description",
        content:
          "Hồ sơ, lịch làm việc, phân quyền, checklist công việc và QR ra vào cho người giúp việc gia đình.",
      },
    ],
  }),
  component: HelperPage,
});

const attTone: Record<string, string> = {
  present: "bg-success text-white",
  leave: "bg-warning text-white",
  absent: "bg-muted text-muted-foreground",
};

function HelperPage() {
  const helper = helpers[0];
  const [tasks, setTasks] = useState<HelperTask[]>(helperTasks);
  const [perms, setPerms] = useState<HelperPermission[]>(defaultPermissions);
  const [showQR, setShowQR] = useState(false);

  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function togglePerm(id: HelperPermission["id"]) {
    setPerms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
    const perm = perms.find((p) => p.id === id);
    if (perm)
      toast.success(`Đã cập nhật quyền: ${perm.label}`, {
        description: !perm.enabled ? "Đã bật" : "Đã tắt",
      });
  }

  const denyOff = perms.filter((p) => p.kind === "deny" && !p.enabled);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        title="Quản lý giúp việc"
        subtitle="Phân công, phân quyền, theo dõi minh bạch"
        emoji="🧑‍🍳"
      />

      {/* Helper profile */}
      <section className="px-4 mt-2">
        <RoundedCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-tint-orange grid place-items-center text-3xl shrink-0">
              {helper.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-base font-bold leading-tight">{helper.name}</p>
                {helper.verified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-success bg-tint-green px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> Đã xác minh
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{helper.role}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-warning fill-warning" />
                  {helper.rating}
                </span>
                <span>{helper.idNumber}</span>
                <span>· {helper.hometown}</span>
              </div>
            </div>
            <a
              href={`tel:${helper.phone.replace(/\s/g, "")}`}
              className="h-10 w-10 rounded-xl bg-brand text-white grid place-items-center shrink-0"
              aria-label="Gọi"
            >
              <Phone className="h-4 w-4" />
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground">Bắt đầu</p>
              <p className="text-xs font-bold">{helper.startDate}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground">Lương/tháng</p>
              <p className="text-xs font-bold">{formatVND(helper.salary)}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-2.5">
              <p className="text-[10px] text-muted-foreground">Trạng thái</p>
              <p className="text-xs font-bold text-success">Đang làm</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowQR((v) => !v)}
              className="flex items-center gap-2 rounded-2xl bg-tint-blue text-brand p-3 font-semibold text-sm"
            >
              <QrCode className="h-5 w-5" /> {showQR ? "Ẩn QR" : "QR ra vào"}
            </button>
            <button
              onClick={() => toast.success("Đã cấp quyền nhận hàng cho hôm nay")}
              className="flex items-center gap-2 rounded-2xl bg-tint-green text-success p-3 font-semibold text-sm"
            >
              <Package className="h-5 w-5" /> Cho nhận hàng
            </button>
          </div>

          {showQR && (
            <div className="rounded-2xl bg-background border border-border p-4 flex items-center gap-3">
              <div className="h-24 w-24 rounded-xl bg-foreground grid place-items-center shrink-0">
                <QrCode className="h-16 w-16 text-background" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-sm">Mã QR cá nhân</p>
                <p className="text-muted-foreground mt-1">
                  Bảo vệ toà nhà quét để xác minh khi {helper.name} ra/vào.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Hết hạn: 23:59 hôm nay
                </p>
              </div>
            </div>
          )}
        </RoundedCard>
      </section>

      {/* Permissions */}
      <section className="px-4 mt-6">
        <SectionHeader
          title="Phân quyền & quyền riêng tư"
          subtitle="Kiểm soát rõ ràng dữ liệu nào được xem"
        />

        {denyOff.length > 0 && (
          <RoundedCard className="bg-tint-red border-0 flex items-start gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-emergency shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emergency">Cảnh báo riêng tư</p>
              <p className="text-foreground/80 mt-0.5">
                Bạn đang tắt {denyOff.length} hạn chế ({denyOff.map((p) => p.label).join(", ")}).
                Người giúp việc có thể thấy dữ liệu nhạy cảm.
              </p>
            </div>
          </RoundedCard>
        )}

        <div className="space-y-2.5">
          {perms.map((p) => {
            const isAllow = p.kind === "allow";
            const on = p.enabled;
            return (
              <button
                key={p.id}
                onClick={() => togglePerm(p.id)}
                className={cn(
                  "w-full text-left rounded-2xl border p-3.5 flex items-start gap-3 transition",
                  on
                    ? isAllow
                      ? "bg-tint-blue border-brand/30"
                      : "bg-tint-red border-emergency/30"
                    : "bg-card border-border",
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-2xl grid place-items-center shrink-0",
                    on
                      ? isAllow
                        ? "bg-brand text-white"
                        : "bg-emergency text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isAllow ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{p.label}</p>
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        isAllow
                          ? "bg-tint-green text-success"
                          : "bg-tint-red text-emergency",
                      )}
                    >
                      {isAllow ? "Cho phép" : "Hạn chế"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {p.desc}
                  </p>
                </div>
                <div
                  className={cn(
                    "shrink-0 mt-1 h-6 w-10 rounded-full p-0.5 transition",
                    on ? "bg-brand" : "bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full bg-white transition shadow-sm",
                      on && "translate-x-4",
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily checklist */}
      <section className="px-4 mt-6">
        <SectionHeader
          title="Checklist hôm nay"
          subtitle={`${doneCount}/${tasks.length} đã xong`}
          action={
            <button
              onClick={() => toast.message("Tính năng giao việc đang phát triển")}
              className="text-xs font-semibold text-brand flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Giao việc
            </button>
          }
        />
        <RoundedCard className="p-0 divide-y divide-border">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTask(t.id)}
              className="flex items-center gap-3 p-4 w-full text-left"
            >
              <div className="h-10 w-10 rounded-2xl bg-tint-green grid place-items-center text-lg shrink-0">
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold truncate",
                    t.done && "line-through text-muted-foreground",
                  )}
                >
                  {t.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{t.time}</p>
              </div>
              <div
                className={cn(
                  "h-6 w-6 rounded-md border-2 grid place-items-center shrink-0",
                  t.done ? "bg-brand border-brand" : "border-border",
                )}
              >
                {t.done && <CheckCircle2 className="h-4 w-4 text-white" />}
              </div>
            </button>
          ))}
        </RoundedCard>
      </section>

      {/* Work schedule */}
      <section className="px-4 mt-6">
        <SectionHeader title="Lịch làm việc trong tuần" />
        <RoundedCard className="p-0 divide-y divide-border">
          {workSchedule.map((d) => (
            <div key={d.day} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold">{d.day}</p>
              <p
                className={cn(
                  "text-xs font-medium",
                  d.off ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {d.hours}
              </p>
            </div>
          ))}
        </RoundedCard>
      </section>

      {/* Attendance */}
      <section className="px-4 mt-6">
        <SectionHeader title="Chấm công tuần này" />
        <RoundedCard>
          <div className="grid grid-cols-7 gap-2">
            {attendance.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">{d.date}</span>
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl grid place-items-center text-[11px] font-bold",
                    attTone[d.status],
                  )}
                >
                  {d.status === "present" ? "✓" : d.status === "leave" ? "P" : "—"}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
            <span>● Có mặt</span>
            <span>● Nghỉ phép</span>
            <span>● Vắng</span>
          </div>
        </RoundedCard>
      </section>

      {/* Activity log */}
      <section className="px-4 mt-6">
        <SectionHeader title="Nhật ký hoạt động" />
        <RoundedCard className="p-0">
          <ol>
            {helperActivity.map((a, idx) => (
              <li key={a.id} className="flex gap-3 px-4 py-3.5">
                <div className="flex flex-col items-center">
                  <div className="h-9 w-9 rounded-2xl bg-tint-blue text-brand grid place-items-center shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  {idx < helperActivity.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground ml-auto">{a.at}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </RoundedCard>
      </section>

      {/* Payments */}
      <section className="px-4 mt-6">
        <SectionHeader title="Lương" />
        <RoundedCard className="p-0 divide-y divide-border">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{p.month}</p>
                <p className="text-[11px] text-muted-foreground">{formatVND(p.amount)}</p>
              </div>
              <span
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-full font-semibold",
                  p.status === "paid"
                    ? "bg-tint-green text-success"
                    : "bg-tint-orange text-warning",
                )}
              >
                {p.status === "paid" ? "Đã trả" : "Chờ trả"}
              </span>
            </div>
          ))}
        </RoundedCard>
      </section>
    </MobileShell>
  );
}
