import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Settings2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { getOpsRequests, type RequestDetail } from "@/lib/console-stats.functions";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ops/sla")({
  head: () => ({ meta: [{ title: "SLA xử lý yêu cầu — STOS Ops" }] }),
  component: SlaDetail,
});

const SLA_HOURS: Record<string, number> = { urgent: 4, high: 8, normal: 24, low: 72 };

function SlaDetail() {
  const fn = useServerFn(getOpsRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["ops-requests", "all"],
    queryFn: () => fn({ data: { kind: "all" } }),
    refetchInterval: 60_000, retry: false,
  });

  const list = data ?? [];
  const evaluated = list.map((r: RequestDetail) => {
    const sla = SLA_HOURS[r.priority] ?? 24;
    const start = new Date(r.created_at).getTime();
    const end = r.status === "resolved" ? new Date(r.updated_at).getTime() : Date.now();
    const hours = Math.round(((end - start) / 36e5) * 10) / 10;
    return { ...r, sla, hours, breach: hours > sla };
  });
  const onTime = evaluated.filter((e) => !e.breach).length;
  const pct = evaluated.length ? Math.round((onTime / evaluated.length) * 1000) / 10 : 0;

  // Group by day
  const byDay = new Map<string, { d: string; inTime: number; breach: number }>();
  for (const e of evaluated) {
    const d = new Date(e.created_at).toISOString().slice(5, 10);
    const row = byDay.get(d) ?? { d, inTime: 0, breach: 0 };
    if (e.breach) row.breach += 1; else row.inTime += 1;
    byDay.set(d, row);
  }
  const chart = Array.from(byDay.values()).sort((a, b) => a.d.localeCompare(b.d)).slice(-14);

  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/ops" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Quay lại
          </Link>
          <h1 className="text-[22px] font-bold mt-1">SLA xử lý yêu cầu</h1>
          <p className="text-[12px] text-muted-foreground">
            Ngưỡng: urgent 4h · high 8h · normal 24h · low 72h
          </p>
        </div>
        <PermissionGate roles={["super_admin", "tenant_admin", "bql_manager"]}>
          <button
            onClick={() => toast.info("Cấu hình SLA (demo)")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-muted"
          >
            <Settings2 className="h-3.5 w-3.5" /> Cấu hình ngưỡng
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Tổng yêu cầu", value: list.length, cls: "text-foreground" },
          { label: "Đúng hạn", value: onTime, cls: "text-success" },
          { label: "Vi phạm SLA", value: evaluated.length - onTime, cls: "text-emergency" },
          { label: "% đúng hạn", value: `${pct}%`, cls: pct >= 90 ? "text-success" : "text-warning" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={cn("text-[24px] font-bold tabular-nums mt-1", k.cls)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold mb-3">Diễn biến SLA 14 ngày</h3>
        <div className="h-[260px]">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mt-20" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="inTime" stroke="oklch(0.55 0.2 264)" strokeWidth={2} name="Đúng hạn" />
                <Line type="monotone" dataKey="breach" stroke="oklch(0.65 0.22 30)" strokeWidth={2} name="Vi phạm" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold">Yêu cầu vi phạm SLA</h3>
          <span className="text-[11px] text-muted-foreground">{evaluated.filter((e) => e.breach).length} mục</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-muted-foreground text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2">Mã</th>
                <th className="text-left px-4 py-2">Tiêu đề</th>
                <th className="text-left px-4 py-2">Mức độ</th>
                <th className="text-right px-4 py-2">Đã trôi</th>
                <th className="text-right px-4 py-2">Ngưỡng</th>
                <th className="text-left px-4 py-2">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {evaluated.filter((e) => e.breach).slice(0, 50).map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{e.id.slice(0, 8)}</td>
                  <td className="px-4 py-2.5 font-medium max-w-[420px] truncate">{e.title}</td>
                  <td className="px-4 py-2.5">{e.priority}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emergency font-semibold">{e.hours}h</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{e.sla}h</td>
                  <td className="px-4 py-2.5">{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
