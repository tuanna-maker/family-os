import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, QrCode, Nfc, Keyboard, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SubHeader } from "./guard.check-in";
import {
  getActiveShift,
  listPatrolLogs,
  logPatrolCheckpoint,
} from "@/api/guard-shifts";

export const Route = createFileRoute("/guard/patrol")({
  head: () => ({ meta: [{ title: "Tuần tra — Bảo vệ" }] }),
  component: PatrolPage,
});

type Coords = { lat: number; lng: number; accuracy?: number } | null;

function PatrolPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [method, setMethod] = useState<"qr" | "nfc" | "manual">("qr");
  const [coords, setCoords] = useState<Coords>(null);

  const shiftQ = useQuery({ queryKey: ["guard-active-shift"], queryFn: () => getActiveShift() });
  const logsQ = useQuery({
    queryKey: ["patrol-logs", "today"],
    queryFn: () => listPatrolLogs({ scope: "today" }),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setCoords({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      () => void 0,
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const submit = useMutation({
    mutationFn: async (m: "qr" | "nfc" | "manual") => {
      if (!code.trim()) throw new Error("Nhập mã điểm tuần tra");
      return logPatrolCheckpoint({
        checkpoint_code: code.trim(),
        route_code: routeCode.trim() || undefined,
        scan_method: m,
        location: coords ?? undefined,
      });
    },
    onSuccess: () => {
      toast.success(`Đã ghi nhận điểm ${code.trim()}`);
      setCode("");
      qc.invalidateQueries({ queryKey: ["patrol-logs"] });
    },
    onError: (e: Error) => toast.error(e.message || "Không ghi nhận được"),
  });

  const logs = logsQ.data ?? [];
  const uniquePoints = new Set(logs.map((l) => l.checkpoint_code)).size;

  return (
    <>
      <SubHeader title="TUẦN TRA" back="/guard" />
      <section className="px-5 mt-4">
        <p className="text-success text-sm font-semibold">
          {shiftQ.data ? `Ca đang mở · ${shiftQ.data.shift_type}` : "Chưa có ca trực đang mở"}
        </p>
        <div className="mt-4 rounded-2xl bg-card border border-border p-4">
          <motionPatrolStats logCount={logs.length} uniquePoints={uniquePoints} coords={coords} />
        </div>
      </section>

      <section className="px-5 mt-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">Quét / nhập điểm</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mã điểm (VD: CP-A1)"
          className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm"
        />
        <input
          value={routeCode}
          onChange={(e) => setRouteCode(e.target.value)}
          placeholder="Mã tuyến (tuỳ chọn)"
          className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { k: "qr", label: "QR", icon: QrCode },
              { k: "nfc", label: "NFC", icon: Nfc },
              { k: "manual", label: "Thủ công", icon: Keyboard },
            ] as const
          ).map((m) => (
            <button
              key={m.k}
              type="button"
              onClick={() => setMethod(m.k)}
              className={`h-11 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 ${
                method === m.k ? "bg-brand text-white border-brand" : "bg-card border-border"
              }`}
            >
              <m.icon className="h-4 w-4" /> {m.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={submit.isPending}
          onClick={() => submit.mutate(method)}
          className="w-full h-14 rounded-2xl bg-brand text-white font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
        >
          <QrCode className="h-5 w-5" />
          {submit.isPending ? "ĐANG GHI..." : "GHI NHẬN ĐIỂM"}
        </button>
      </section>

      <section className="px-5 mt-6 mb-10">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Nhật ký hôm nay</p>
        {logsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-4 text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Chưa có lượt tuần tra nào hôm nay
          </div>
        ) : (
          <ul className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-3.5">
                <span className="h-6 w-6 rounded-full bg-success grid place-items-center shrink-0">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{l.checkpoint_code}</p>
                  {l.route_code && (
                    <p className="text-[11px] text-muted-foreground">Tuyến {l.route_code}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(l.scanned_at).toLocaleTimeString("vi-VN", { hour12: false })}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">{l.scan_method}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function motionPatrolStats({
  logCount,
  uniquePoints,
  coords,
}: {
  logCount: number;
  uniquePoints: number;
  coords: Coords;
}) {
  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Hôm nay</span>
        <span className="font-semibold">
          {logCount} lượt · {uniquePoints} điểm
        </span>
      </div>
      {coords && (
        <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}
    </>
  );
}
