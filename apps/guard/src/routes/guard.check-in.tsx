import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Info, Clock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { checkInShift } from "@/api/guard-shifts";

export const Route = createFileRoute("/guard/check-in")({
  head: () => ({ meta: [{ title: "Vào ca — Bảo vệ" }] }),
  component: CheckInPage,
});

type Coords = { lat: number; lng: number; accuracy?: number } | null;

function CheckInPage() {
  const navigate = useNavigate();
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
      (p) =>
        setCoords({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
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
      const res = await checkInShift({ location: coords ?? undefined });
      toast.success(res.reused ? "Đã có ca đang mở" : "Đã xác nhận vào ca", {
        description: `Lúc ${time}`,
      });
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
        <motionCircle hasLocation={hasLocation} />
        <p
          className={`mt-5 text-base font-semibold ${hasLocation ? "text-success" : "text-muted-foreground"}`}
        >
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
        <motionClock time={time} date={date} tone="success" />
        <motionInfo />
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

function motionCircle({ hasLocation }: { hasLocation: boolean }) {
  return (
    <div
      className={`relative h-44 w-44 rounded-full bg-card border-4 ${hasLocation ? "border-success/30" : "border-muted"} grid place-items-center mt-4`}
    >
      <div
        className={`absolute inset-2 rounded-full border-2 ${hasLocation ? "border-success/40 animate-pulse" : "border-muted"}`}
      />
      <MapPin
        className={`h-16 w-16 ${hasLocation ? "text-success" : "text-muted-foreground"}`}
        strokeWidth={2.4}
      />
    </div>
  );
}

function motionClock({
  time,
  date,
  tone,
}: {
  time: string;
  date: string;
  tone: "success" | "emergency";
}) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Clock className="h-3.5 w-3.5" />
        Thời gian hiện tại
      </div>
      <p
        className={`mt-2 text-3xl font-bold tracking-wider tabular-nums ${tone === "success" ? "text-success" : "text-emergency"}`}
      >
        {time}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{date}</p>
    </div>
  );
}

function motionInfo() {
  return (
    <div className="mt-4 rounded-2xl bg-info/10 border border-info/30 p-4 flex items-start gap-2">
      <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
      <p className="text-[12px] text-foreground/80">
        Vị trí sẽ được lưu kèm ca trực để đối chiếu. Bạn vẫn có thể vào ca khi không có GPS.
      </p>
    </div>
  );
}

export function SubHeader({
  title,
  back,
  right,
}: {
  title: string;
  back: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3 border-b border-border">
      <Link
        to={back as "/guard"}
        className="h-9 w-9 rounded-full bg-card border border-border grid place-items-center"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <h1 className="text-sm font-bold tracking-wide uppercase flex-1">{title}</h1>
      {right}
    </header>
  );
}
