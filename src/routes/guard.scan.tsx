import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GuardMobileShell } from "@/components/guard/GuardMobileShell";
import { GroupedSection } from "@/components/guard/ios/GroupedCard";
import { ListRow } from "@/components/guard/ios/ListRow";
import { recentScans } from "@/features/guard-mobile/data";
import { hapticMedium } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Keyboard,
  ScanLine,
} from "lucide-react";

export const Route = createFileRoute("/guard/scan")({
  head: () => ({ meta: [{ title: "Quét QR — STOS Guard" }] }),
  component: GuardScanPage,
});

function GuardScanPage() {
  const [mode, setMode] = useState<"guest" | "vehicle">("guest");
  const [scanning, setScanning] = useState(false);

  function startScan() {
    hapticMedium();
    setScanning(true);
    toast.message("Đang mở camera…", {
      description: "Tích hợp quét QR/NFC — Phase 3.",
    });
    window.setTimeout(() => setScanning(false), 1200);
  }

  return (
    <GuardMobileShell largeTitle="Quét QR" subtitle="Khách thăm · xe ra/vào">
      {/* Mode segmented control — iOS pattern */}
      <section className="px-4 mt-3">
        <div
          className="flex p-1 rounded-[10px] bg-muted/60 border border-border"
          role="tablist"
          aria-label="Loại quét"
        >
          {(
            [
              { id: "guest" as const, label: "Khách đi bộ" },
              { id: "vehicle" as const, label: "Xe" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => {
                hapticMedium();
                setMode(m.id);
              }}
              className={cn(
                "flex-1 min-h-[36px] rounded-[8px] text-[13px] font-semibold transition-colors",
                mode === m.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* Scanner viewport placeholder — keeps UI, camera Phase 3 */}
      <section className="px-4 mt-5">
        <button
          type="button"
          onClick={startScan}
          disabled={scanning}
          className="w-full aspect-[4/3] max-h-[280px] rounded-[14px] border-2 border-dashed border-brand/40 bg-muted/30 flex flex-col items-center justify-center gap-3 active:scale-[0.99] transition disabled:opacity-70"
          aria-label="Bắt đầu quét QR"
        >
          <span className="h-16 w-16 rounded-2xl bg-brand/15 grid place-items-center">
            {scanning ? (
              <span className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-brand" />
            )}
          </span>
          <p className="text-[16px] font-bold">
            {scanning ? "Đang quét…" : "Chạm để quét"}
          </p>
          <p className="text-[12px] text-muted-foreground px-6 text-center">
            Đưa mã QR khách hoặc thẻ xe vào khung hình
          </p>
        </button>
      </section>

      <section className="px-4 mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={startScan}
          className="flex items-center justify-center gap-2 min-h-[48px] rounded-[14px] bg-brand text-primary-foreground font-semibold text-[15px] active:scale-[0.98] transition"
        >
          <ScanLine className="h-5 w-5" />
          Quét ngay
        </button>
        <button
          type="button"
          onClick={() => toast.message("Nhập mã thủ công", { description: "Phase 3." })}
          className="flex items-center justify-center gap-2 min-h-[48px] rounded-[14px] bg-card border border-border font-semibold text-[15px] active:scale-[0.98] transition"
        >
          <Keyboard className="h-5 w-5 text-muted-foreground" />
          Nhập mã
        </button>
      </section>

      <GroupedSection title="Vừa quét" footer="Lịch sử đồng bộ với Command Center theo thời gian thực.">
        {recentScans.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-border last:border-b-0"
          >
            <span
              className={cn(
                "h-9 w-9 rounded-full grid place-items-center shrink-0",
                s.direction === "Vào" ? "bg-tint-green text-success" : "bg-tint-orange text-warning",
              )}
            >
              {s.direction === "Vào" ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium truncate">{s.name}</p>
              <p className="text-[12px] text-muted-foreground">
                {s.unit} · {s.time}
              </p>
            </div>
            <span
              className={cn(
                "text-[11px] font-bold uppercase",
                s.ok ? "text-success" : "text-emergency",
              )}
            >
              {s.direction}
            </span>
          </div>
        ))}
        <ListRow title="Xem nhật ký đầy đủ" to="/guard/tasks" showChevron />
      </GroupedSection>

      <section className="px-4 mt-4 mb-2">
        <Link
          to="/guard/tasks"
          className="block text-center text-[13px] font-semibold text-brand min-h-[44px] leading-[44px] active:opacity-60"
        >
          Báo khách không có mã QR →
        </Link>
      </section>
    </GuardMobileShell>
  );
}
