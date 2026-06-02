import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, X } from "lucide-react";
import { triggerSos } from "@/lib/sos.functions";
import { useFamilyContext } from "@/hooks/use-family-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HOLD_MS = 1500;
const COUNTDOWN_S = 3;

type Phase = "idle" | "holding" | "countdown" | "sending";

export function SosButton() {
  const { familyId } = useFamilyContext();
  const navigate = useNavigate();
  const trigger = useServerFn(triggerSos);

  const [phase, setPhase] = useState<Phase>("idle");
  const [holdPct, setHoldPct] = useState(0); // 0..1
  const [countdown, setCountdown] = useState(COUNTDOWN_S);

  const holdTimer = useRef<number | null>(null);
  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef<number>(0);
  const countdownTimer = useRef<number | null>(null);

  const clearAll = useCallback(() => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (holdRaf.current) window.cancelAnimationFrame(holdRaf.current);
    if (countdownTimer.current) window.clearInterval(countdownTimer.current);
    holdTimer.current = null;
    holdRaf.current = null;
    countdownTimer.current = null;
  }, []);

  useEffect(() => () => clearAll(), [clearAll]);

  const fireSos = useCallback(async () => {
    if (!familyId) {
      toast.error("Chưa có hộ gia đình. Vui lòng thiết lập trước.");
      setPhase("idle");
      return;
    }
    setPhase("sending");
    try {
      let location: { lat: number; lng: number; accuracy?: number } | null = null;
      try {
        location = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (p) =>
              resolve({
                lat: p.coords.latitude,
                lng: p.coords.longitude,
                accuracy: p.coords.accuracy,
              }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 2000 },
          );
        });
      } catch {
        location = null;
      }

      const res = await trigger({
        data: {
          householdId: familyId,
          triggerKind: "manual",
          severity: "high",
          location,
          deviceInfo: {
            platform: "web",
            user_agent: navigator.userAgent.slice(0, 500),
          },
        },
      });
      toast.success("Đã gửi SOS. Bảo vệ đang được thông báo.");
      navigate({ to: "/sos/$eventId", params: { eventId: res.eventId } } as any);
    } catch (e) {
      toast.error("Không gửi được SOS: " + ((e as Error).message ?? "lỗi"));
      setPhase("idle");
    }
  }, [familyId, trigger, navigate]);

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdown(COUNTDOWN_S);
    let n = COUNTDOWN_S;
    countdownTimer.current = window.setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        if (countdownTimer.current) window.clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        fireSos();
      }
    }, 1000);
    // haptic
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
  }, [fireSos]);

  const onPressStart = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "idle") return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setPhase("holding");
      setHoldPct(0);
      holdStart.current = performance.now();
      if (navigator.vibrate) navigator.vibrate(20);

      const tick = () => {
        const pct = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
        setHoldPct(pct);
        if (pct < 1) holdRaf.current = window.requestAnimationFrame(tick);
      };
      holdRaf.current = window.requestAnimationFrame(tick);

      holdTimer.current = window.setTimeout(() => {
        startCountdown();
      }, HOLD_MS);
    },
    [phase, startCountdown],
  );

  const onPressEnd = useCallback(() => {
    if (phase === "holding") {
      clearAll();
      setPhase("idle");
      setHoldPct(0);
    }
  }, [phase, clearAll]);

  const cancelCountdown = useCallback(() => {
    clearAll();
    setPhase("idle");
    setHoldPct(0);
    setCountdown(COUNTDOWN_S);
    toast.info("Đã huỷ SOS.");
  }, [clearAll]);

  // Don't render if no household yet
  if (!familyId) return null;

  return (
    <>
      {/* Sticky FAB */}
      <button
        type="button"
        aria-label="Nút SOS — giữ 1.5 giây để kích hoạt"
        onPointerDown={onPressStart}
        onPointerUp={onPressEnd}
        onPointerCancel={onPressEnd}
        onPointerLeave={onPressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "fixed z-40 right-4 bottom-[92px] h-16 w-16 rounded-full",
          "bg-emergency text-white grid place-items-center select-none touch-none",
          "shadow-[0_8px_24px_-4px_oklch(0.55_0.22_25/0.55)]",
          "active:scale-95 transition-transform",
          phase === "holding" && "scale-110",
        )}
        style={{
          backgroundImage:
            phase === "holding"
              ? `conic-gradient(oklch(0.98 0 0 / 0.45) ${holdPct * 360}deg, transparent 0deg)`
              : undefined,
        }}
      >
        <span className="absolute inset-1.5 rounded-full bg-emergency grid place-items-center">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <span className="sr-only">SOS</span>
      </button>

      {/* Countdown overlay */}
      {(phase === "countdown" || phase === "sending") && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm grid place-items-center px-6">
          <div className="text-center text-white">
            <div className="mx-auto h-32 w-32 rounded-full bg-emergency grid place-items-center shadow-[0_0_60px_oklch(0.6_0.22_25/0.7)] animate-pulse">
              {phase === "sending" ? (
                <span className="text-lg font-semibold">Đang gửi…</span>
              ) : (
                <span className="text-[64px] font-bold leading-none tabular-nums">
                  {countdown}
                </span>
              )}
            </div>
            <p className="mt-6 text-lg font-semibold">
              {phase === "sending" ? "Đang kích hoạt SOS" : "SOS sẽ gửi sau"}
            </p>
            <p className="mt-1 text-sm text-white/70">
              Bảo vệ và người thân sẽ được thông báo ngay lập tức.
            </p>

            {phase === "countdown" && (
              <button
                type="button"
                onClick={cancelCountdown}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-foreground font-semibold"
              >
                <X className="h-4 w-4" />
                Huỷ
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
