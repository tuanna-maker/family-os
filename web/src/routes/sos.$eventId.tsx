import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, Shield } from "lucide-react";
import { useSosRealtime } from "@/hooks/use-sos-realtime";
import { MobileShell } from "@/components/mobile/MobileShell";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/sos/$eventId")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "SOS đang xử lý — STOS Life" }] }),
  component: SosTimelinePage,
});

function SosTimelinePage() {
  const { eventId } = Route.useParams();
  const { event, timeline, status, isLoading, error } = useSosRealtime(eventId);

  const statusLabel: Record<string, { text: string; tone: string; icon: any }> = {
    triggered: { text: "Đã gửi — chờ bảo vệ tiếp nhận", tone: "bg-emergency text-white", icon: AlertTriangle },
    acknowledged: { text: "Bảo vệ đã tiếp nhận", tone: "bg-warning text-white", icon: Shield },
    dispatched: { text: "Bảo vệ đang trên đường", tone: "bg-brand text-white", icon: Shield },
    resolved: { text: "Đã xử lý xong", tone: "bg-success text-white", icon: CheckCircle2 },
    cancelled: { text: "Đã huỷ", tone: "bg-muted text-foreground", icon: CheckCircle2 },
  };
  const cur = event ? statusLabel[event.status] ?? statusLabel.triggered : statusLabel.triggered;
  const Icon = cur.icon;

  return (
    <MobileShell>
      <header className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Link to="/gia-dinh" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted/60">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[17px] font-bold tracking-tight">SOS đang xử lý</h1>
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
      {error && <div className="px-4 py-10 text-center text-emergency">{error.message}</div>}

      {event && (
        <>
          <section className="px-4 mt-2">
            <div className={cn("rounded-2xl p-5 shadow-sm", cur.tone)}>
              <div className="flex items-center gap-3">
                <Icon className="h-7 w-7" />
                <div>
                  <p className="text-[15px] font-bold">{cur.text}</p>
                  <p className="text-[12px] opacity-80 mt-0.5">
                    Mã: {event.id.slice(0, 8).toUpperCase()} · Mức {event.severity}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="px-4 mt-5">
            <h2 className="text-[14px] font-bold mb-3">Dòng thời gian</h2>
            <ol className="relative border-l-2 border-border pl-5 space-y-4">
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
        </>
      )}
    </MobileShell>
  );
}
