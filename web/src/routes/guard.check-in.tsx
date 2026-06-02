import { SubHeader } from "@/features/guard/SubHeader";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Info, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { checkInShift } from "@/lib/guard.functions";

export const Route = createFileRoute("/guard/check-in")({
  head: () => ({ meta: [{ title: "Vào ca — Bảo vệ" }] }),
  component: CheckInPage,
});

type Coords = { lat: number; lng: number; accuracy?: number } | null;

function CheckInPage() {
  const navigate = useNavigate();
  const checkIn = useServerFn(checkInShift);
  const [now, setNow] = useState(() => new Date());
  const [coords, setCoords] = useState<Coords>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Thiết bị không hỗ trợ định vị");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => setGeoError(e.message || "Không lấy được vị trí"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const time = now.toLocaleTimeString("vi-VN", { hour12: false });
  const date = now.toLocaleDateString("vi-VN");
  const hasLocation = !!coords;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await checkIn({ data: { location: coords ?? undefined } });
      toast.success(res.reused ? "Đã có ca đang mở" : "Đã xác nhận vào ca", { description: `Lúc ${time}` });
      navigate({ to: "/guard" });
    } catch (e) {
      toast.error("Không vào ca được", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SubHeader title="VÀO CA (CHECK-IN)" back="/guard" />

      <section className="px-5 mt-2 flex flex-col items-center">
        <div className={`relative h-44 w-44 rounded-full bg-card border-4 ${hasLocation ? "border-success/30" : "border-muted"} grid place-items-center mt-4`}>
          <div className={`absolute inset-2 rounded-full border-2 ${hasLocation ? "border-success/40 animate-pulse" : "border-muted"}`} />
          <MapPin className={`h-16 w-16 ${hasLocation ? "text-success" : "text-muted-foreground"}`} strokeWidth={2.4} />
        </div>
        <p className={`mt-5 text-base font-semibold ${hasLocation ? "text-success" : "text-muted-foreground"}`}>
          {hasLocation ? "Lấy vị trí thành công" : geoError ? "Không lấy được vị trí" : "Đang lấy vị trí…"}
        </p>
        {coords && (
          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy ?? 0)}m
          </p>
        )}
        {geoError && <p className="text-[11px] text-warning mt-1">{geoError}</p>}
      </section>

      <section className="px-5 mt-6">
        <div className="rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock className="h-3.5 w-3.5" />
            Thời gian hiện tại
          </div>
          <p className="mt-2 text-3xl font-bold text-success tracking-wider tabular-nums">{time}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{date}</p>
        </div>

        <div className={`mt-4 rounded-2xl border p-4 flex items-start gap-2 ${
          geoError ? "bg-warning/10 border-warning/30" : "bg-info/10 border-info/30"
        }`}>
          <Info className={`h-4 w-4 shrink-0 mt-0.5 ${geoError ? "text-warning" : "text-info"}`} />
          <p className="text-[12px] text-foreground/80">
            {geoError
              ? "Không có GPS — ca trực sẽ ghi nhận nhưng thiếu tọa độ. Bật vị trí để dễ đối chiếu."
              : "Vị trí sẽ được lưu kèm ca trực để đối chiếu. Bạn vẫn có thể vào ca khi không có GPS."}
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-5 w-full h-14 rounded-2xl bg-success text-white font-bold tracking-wide shadow-lg active:scale-[0.98] transition disabled:opacity-70"
        >
          {submitting ? "ĐANG XÁC NHẬN…" : "XÁC NHẬN VÀO CA"}
        </button>
      </section>
    </>
  );
}

