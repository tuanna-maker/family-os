import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, MapPin, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { acknowledgeSos, listActiveSos, type SosEvent } from "@/lib/sos.functions";

/**
 * Full-screen P0 SOS alert for guards.
 * - Subscribes to INSERT on care.sos_event (status='triggered')
 * - Plays haptic + audio beep when alert appears
 * - 1-tap "TIẾP NHẬN" → acknowledgeSos + navigate to /guard/sos/$id
 */
export function SosAlertOverlay() {
  const [active, setActive] = useState<SosEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const ack = useServerFn(acknowledgeSos);
  const listActive = useServerFn(listActiveSos);
  const navigate = useNavigate();

  // Initial fetch: any already-triggered event?
  useEffect(() => {
    let cancelled = false;
    listActive()
      .then((rows) => {
        if (cancelled) return;
        const pending = rows.find((r) => r.status === "triggered");
        if (pending) setActive(pending);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listActive]);

  // Realtime subscription on care.sos_event INSERTs
  useEffect(() => {
    const ch = supabase
      .channel("guard:sos-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "care", table: "sos_event" },
        (payload) => {
          const ev = payload.new as SosEvent;
          if (ev.status === "triggered") {
            setActive((cur) => cur ?? ev);
            triggerSignals();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Re-trigger signals when alert appears (covers initial fetch case)
  useEffect(() => {
    if (active) triggerSignals();
  }, [active]);

  const onAck = useCallback(async () => {
    if (!active || busy) return;
    setBusy(true);
    try {
      await ack({ data: { eventId: active.id } });
      const id = active.id;
      setActive(null);
      toast.success("Đã tiếp nhận SOS");
      navigate({ to: "/guard/sos/$eventId", params: { eventId: id } as any });
    } catch (e: any) {
      toast.error(e?.message || "Không tiếp nhận được");
      setBusy(false);
    }
  }, [active, busy, ack, navigate]);

  if (!active) return null;

  const loc = active.location as { lat?: number; lng?: number; address?: string; label?: string } | null;

  return (
    <div className="fixed inset-0 z-[100] bg-emergency text-white flex flex-col animate-in fade-in">
      <div className="absolute inset-0 bg-emergency animate-pulse opacity-40 pointer-events-none" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-24 w-24 rounded-full bg-white/15 grid place-items-center mb-5 ring-4 ring-white/30 animate-pulse">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <p className="text-[11px] tracking-[0.3em] font-semibold opacity-90">SOS KHẨN CẤP</p>
        <h1 className="text-3xl font-black mt-1">Cần hỗ trợ ngay</h1>
        <p className="text-sm opacity-90 mt-2">
          Mức: <span className="font-bold uppercase">{active.severity}</span> · Mã{" "}
          {active.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="mt-6 w-full max-w-sm space-y-2 text-left text-[13px]">
          {loc && (loc.address || loc.label || (loc.lat && loc.lng)) && (
            <div className="flex items-start gap-2 bg-white/10 rounded-xl px-3 py-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="break-all">
                {loc.address || loc.label || `${loc.lat?.toFixed(5)}, ${loc.lng?.toFixed(5)}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{new Date(active.created_at).toLocaleTimeString("vi-VN")}</span>
          </div>
        </div>
      </div>

      <div className="relative p-5 pb-7 space-y-3">
        <button
          onClick={onAck}
          disabled={busy}
          className="w-full h-16 rounded-2xl bg-white text-emergency font-black text-lg shadow-2xl active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Check className="h-6 w-6" />
          {busy ? "Đang tiếp nhận…" : "TIẾP NHẬN NGAY"}
        </button>
        <p className="text-center text-[11px] opacity-75">
          Một chạm để xác nhận bạn đang xử lý sự cố này
        </p>
      </div>
    </div>
  );
}

function triggerSignals() {
  // Vibration
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([300, 120, 300, 120, 600]);
    }
  } catch {}
  // Beep
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const beep = (t: number, freq: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = "square";
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    };
    beep(0, 880);
    beep(0.35, 660);
    beep(0.7, 880);
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {}
}
