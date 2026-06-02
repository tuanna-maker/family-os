import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, MapPin, Shield, XCircle, HeartPulse, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useSosRealtime } from "@/hooks/use-sos-realtime";
import { resolveSos } from "@/lib/sos.functions";
import { getEmergencyHealth } from "@/lib/health.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/guard/sos/$eventId")({
  head: () => ({ meta: [{ title: "Xử lý SOS — Bảo vệ" }] }),
  component: GuardSosDetail,
});

function GuardSosDetail() {
  const { eventId } = Route.useParams();
  const { event, timeline, status, isLoading } = useSosRealtime(eventId);
  const resolve = useServerFn(resolveSos);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"resolve" | "cancel" | null>(null);

  const onResolve = async (cancelled: boolean) => {
    setBusy(cancelled ? "cancel" : "resolve");
    try {
      await resolve({ data: { eventId, cancelled } });
      toast.success(cancelled ? "Đã huỷ" : "Đã xử lý xong");
      navigate({ to: "/guard" });
    } catch (e: any) {
      toast.error(e?.message || "Lỗi");
      setBusy(null);
    }
  };

  const loc = (event?.location ?? null) as
    | { lat?: number; lng?: number; address?: string; label?: string }
    | null;

  const statusInfo: Record<string, { text: string; tone: string }> = {
    triggered: { text: "Chưa tiếp nhận", tone: "bg-emergency text-white" },
    acknowledged: { text: "Bạn đang xử lý", tone: "bg-warning text-white" },
    dispatched: { text: "Đang trên đường", tone: "bg-brand text-white" },
    resolved: { text: "Đã xong", tone: "bg-success text-white" },
    cancelled: { text: "Đã huỷ", tone: "bg-muted text-foreground" },
  };
  const cur = event ? statusInfo[event.status] ?? statusInfo.triggered : statusInfo.triggered;
  const closed = event?.status === "resolved" || event?.status === "cancelled";

  return (
    <>
      <header className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Link to="/guard" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted/60">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[17px] font-bold tracking-tight">Xử lý SOS</h1>
        <span
          className={cn(
            "ml-auto text-[10px] px-2 py-1 rounded-full font-semibold",
            status === "connected" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {status === "connected" ? "● Live" : status}
        </span>
      </header>

      {isLoading && <div className="px-4 py-10 text-center text-muted-foreground">Đang tải…</div>}

      {event && (
        <>
          <section className="px-4">
            <div className={cn("rounded-2xl p-5 shadow-sm", cur.tone)}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-7 w-7" />
                <div>
                  <p className="text-[15px] font-bold">{cur.text}</p>
                  <p className="text-[12px] opacity-80 mt-0.5">
                    Mã {event.id.slice(0, 8).toUpperCase()} · Mức {event.severity}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="px-4 mt-4 space-y-2">
            {loc && (loc.address || loc.label || loc.lat) && (
              <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3 text-[13px]">
                <MapPin className="h-4 w-4 mt-0.5 text-brand shrink-0" />
                <span className="break-all">
                  {loc.address || loc.label || `${loc.lat?.toFixed(5)}, ${loc.lng?.toFixed(5)}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3 text-[13px]">
              <Clock className="h-4 w-4 text-brand" />
              <span>{new Date(event.created_at).toLocaleString("vi-VN")}</span>
            </div>
          </section>

          <section className="px-4 mt-5">
            <h2 className="text-[14px] font-bold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Dòng thời gian
            </h2>
            <ol className="relative border-l-2 border-border pl-5 space-y-3">
              {timeline.length === 0 && (
                <li className="text-[13px] text-muted-foreground">Chưa có sự kiện.</li>
              )}
              {timeline.map((t) => (
                <li key={t.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-brand ring-2 ring-card" />
                  <p className="text-[13px] font-semibold capitalize">{t.kind.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {new Date(t.created_at).toLocaleTimeString("vi-VN")}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {!closed && event.household_id && (
            <EmergencyHealthSection familyId={event.household_id} />
          )}

          {!closed && (
            <section className="px-4 mt-6 pb-8 space-y-2">
              <button
                onClick={() => onResolve(false)}
                disabled={busy !== null}
                className="w-full h-14 rounded-2xl bg-success text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
              >
                <CheckCircle2 className="h-5 w-5" />
                {busy === "resolve" ? "Đang lưu…" : "ĐÃ XỬ LÝ XONG"}
              </button>
              <button
                onClick={() => onResolve(true)}
                disabled={busy !== null}
                className="w-full h-12 rounded-2xl bg-muted text-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Huỷ (báo nhầm)
              </button>
            </section>
          )}
        </>
      )}
    </>
  );
}

function EmergencyHealthSection({ familyId }: { familyId: string }) {
  const [open, setOpen] = useState(false);
  const fetchHealth = useServerFn(getEmergencyHealth);
  const { data, isLoading, error } = useQuery({
    queryKey: ["emergency-health", familyId],
    queryFn: () => fetchHealth({ data: { family_id: familyId } }),
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <section className="px-4 mt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full h-12 rounded-2xl border-2 border-danger/40 bg-danger/5 text-danger font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
      >
        {open ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        <HeartPulse className="h-4 w-4" />
        {open ? "Ẩn hồ sơ y tế khẩn cấp" : "Mở hồ sơ y tế khẩn cấp"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {isLoading && <p className="text-[13px] text-muted-foreground">Đang giải mã hồ sơ…</p>}
          {error && <p className="text-[13px] text-danger">Không tải được hồ sơ y tế.</p>}
          {data?.profiles?.map((p: any) => (
            <div key={p.user_id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-bold">{p.display_name || p.user_id.slice(0, 8)}</p>
                {p.emergency_unlocked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger text-white">
                    EMERGENCY
                  </span>
                )}
              </div>
              <dl className="text-[12px] space-y-1">
                {p.blood_type && (
                  <div><dt className="inline text-muted-foreground">Nhóm máu: </dt><dd className="inline font-semibold">{p.blood_type}</dd></div>
                )}
                {p.allergies && (
                  <div><dt className="inline text-muted-foreground">Dị ứng: </dt><dd className="inline">{p.allergies}</dd></div>
                )}
                {p.conditions && (
                  <div><dt className="inline text-muted-foreground">Bệnh nền: </dt><dd className="inline">{p.conditions}</dd></div>
                )}
                {p.notes && (
                  <div><dt className="inline text-muted-foreground">Ghi chú: </dt><dd className="inline">{p.notes}</dd></div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
