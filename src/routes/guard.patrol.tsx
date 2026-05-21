import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GuardMobileShell } from "@/components/guard/GuardMobileShell";
import { GroupedSection } from "@/components/guard/ios/GroupedCard";
import { patrolCheckpoints } from "@/features/guard-mobile/data";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptic";
import { CheckCircle2, Circle, MapPin, ScanLine } from "lucide-react";

export const Route = createFileRoute("/guard/patrol")({
  head: () => ({ meta: [{ title: "Tuần tra — STOS Guard" }] }),
  component: GuardPatrolPage,
});

function GuardPatrolPage() {
  const [points, setPoints] = useState(patrolCheckpoints);
  const done = points.filter((p) => p.done).length;
  const pct = Math.round((done / points.length) * 100);

  function markDone(id: string) {
    hapticMedium();
    setPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, done: true } : p)),
    );
    toast.success("Đã xác nhận checkpoint", {
      description: "Vị trí GPS & thời gian đã ghi nhận.",
    });
  }

  return (
    <GuardMobileShell
      largeTitle="Tuần tra"
      subtitle={`${done}/${points.length} điểm · ${pct}% hoàn thành`}
    >
      <section className="px-4 mt-2">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <GroupedSection
        title="Lộ trình ca trực"
        footer="Giữ màn hình sáng khi tuần tra. Quét QR tại mỗi điểm để tránh bỏ sót."
      >
        {points.map((cp, i) => (
          <div
            key={cp.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 min-h-[56px] border-b border-border last:border-b-0",
              !cp.done && "bg-muted/20",
            )}
          >
            <div className="w-6 shrink-0 text-center text-[11px] font-mono text-muted-foreground">
              {i + 1}
            </div>
            {cp.done ? (
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium">{cp.name}</p>
              <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                Hạn {cp.due}
              </p>
            </div>
            {!cp.done ? (
              <button
                type="button"
                onClick={() => markDone(cp.id)}
                className="shrink-0 flex items-center gap-1 rounded-full bg-brand text-primary-foreground text-[12px] font-semibold px-3 min-h-[36px] active:scale-95 transition"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Quét
              </button>
            ) : (
              <span className="text-[12px] font-medium text-success shrink-0">Xong</span>
            )}
          </div>
        ))}
      </GroupedSection>

      <section className="px-4 mt-6">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            toast.message("Bản đồ tuần tra", {
              description: "Tích hợp bản đồ realtime — Phase 3.",
            });
          }}
          className="w-full min-h-[48px] rounded-[14px] border border-border bg-card text-[15px] font-semibold active:scale-[0.98] transition"
        >
          Mở bản đồ lộ trình
        </button>
      </section>
    </GuardMobileShell>
  );
}
