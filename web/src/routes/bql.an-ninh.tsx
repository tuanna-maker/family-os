import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getBqlSecurityOverview } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, MapPin, ClipboardCheck, Users, AlertTriangle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/bql/an-ninh")({
  head: () => ({ meta: [{ title: "An ninh — BQL" }] }),
  component: SecurityCenter,
});

const STATUS_LABEL: Record<string, string> = { open: "Mới", investigating: "Điều tra", resolved: "Xong", closed: "Đóng" };
const SEV_TONE: Record<string, string> = { low: "text-muted-foreground", medium: "text-foreground", high: "text-warning", critical: "text-emergency" };

function SecurityCenter() {
  const { projectId } = useBqlProject();
  const fn = useServerFn(getBqlSecurityOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-security", projectId || "all"],
    queryFn: () => fn({ data: { projectId: projectId || undefined } }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Trung tâm an ninh</h1>
          <p className="text-sm text-muted-foreground">SOS, tuần tra, ca trực và sự cố theo realtime.</p>
        </div>
        <Link to="/bql/su-co"><Button size="sm" variant="outline" className="gap-1.5">Xem sự cố <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Sự cố đang mở" value={data?.open_incidents ?? 0} tone="danger" />
        <Stat icon={<ShieldAlert className="h-4 w-4" />} label="Sự cố nghiêm trọng" value={data?.critical_incidents ?? 0} tone="danger" />
        <Stat icon={<Users className="h-4 w-4" />} label="Ca trực đang hoạt động" value={data?.shifts_active ?? 0} />
        <Stat icon={<ClipboardCheck className="h-4 w-4" />} label="Tuần tra hôm nay" value={data?.patrols_today ?? 0} tone="success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Sự cố gần đây</h2>
            <Link to="/bql/su-co" className="text-[11px] text-primary hover:underline">Tất cả →</Link>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : !data?.recentIncidents.length ? (
            <p className="text-sm text-muted-foreground italic">Chưa có sự cố.</p>
          ) : (
            <ul className="divide-y -mx-2">
              {data.recentIncidents.map((r) => (
                <li key={r.id} className="px-2 py-2 flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold ${SEV_TONE[r.severity] ?? ""}`}>{r.severity}</span>
                  <span className="flex-1 text-[12px] truncate">{r.project_name}</span>
                  <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Ca trực đang hoạt động</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : !data?.activeShifts.length ? (
            <p className="text-sm text-muted-foreground italic">Không có ca nào.</p>
          ) : (
            <ul className="divide-y -mx-2">
              {data.activeShifts.map((s) => (
                <li key={s.id} className="px-2 py-2 text-[12px] flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.guard_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.project_name} · {s.shift_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px]">{new Date(s.start_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
                    <Badge variant={s.check_in_at ? "default" : "outline"} className="text-[9px]">{s.check_in_at ? "Đã chấm" : "Chờ chấm"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Quét tuần tra hôm nay</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : !data?.recentPatrols.length ? (
            <p className="text-sm text-muted-foreground italic">Chưa có lượt quét nào hôm nay.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.recentPatrols.map((p) => (
                <div key={p.id} className="border rounded-md p-2 text-[12px]">
                  <p className="font-mono font-semibold">{p.checkpoint_code}</p>
                  <p className="text-[11px] text-muted-foreground">{p.guard_name} · {p.project_name}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(p.scanned_at).toLocaleString("vi-VN")}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "success" | "danger" }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">{icon}{label}</div>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${tone === "success" ? "text-success" : tone === "danger" ? "text-emergency" : ""}`}>{value}</p>
    </Card>
  );
}
