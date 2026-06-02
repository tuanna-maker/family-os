import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBqlIncidents, updateIncidentStatus, type IncidentRow } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, AlertTriangle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/bql/su-co")({
  head: () => ({ meta: [{ title: "Sự cố — BQL" }] }),
  component: IncidentsScreen,
});

const STATUS_LABEL: Record<string, string> = {
  open: "Mới", investigating: "Đang điều tra", resolved: "Đã giải quyết", closed: "Đóng",
};
const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive", investigating: "default", resolved: "secondary", closed: "outline",
};
const SEV_TONE: Record<string, string> = {
  low: "text-muted-foreground", medium: "text-foreground", high: "text-warning", critical: "text-emergency",
};
const SEV_LABEL: Record<string, string> = { low: "Thấp", medium: "Trung bình", high: "Cao", critical: "Nghiêm trọng" };

function IncidentsScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [detail, setDetail] = useState<IncidentRow | null>(null);
  const qc = useQueryClient();

  const fn = useServerFn(listBqlIncidents);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-incidents", projectId || "all", status, severity],
    queryFn: () => fn({ data: { projectId: projectId || undefined, status, severity } }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => rows.filter((r) => {
    if (!q.trim()) return true;
    const Q = q.toLowerCase();
    return r.title.toLowerCase().includes(Q) || (r.location ?? "").toLowerCase().includes(Q) || r.project_name.toLowerCase().includes(Q);
  }), [rows, q]);

  const stats = useMemo(() => ({
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    investigating: rows.filter((r) => r.status === "investigating").length,
    resolved: rows.filter((r) => r.status === "resolved" || r.status === "closed").length,
    critical: rows.filter((r) => r.severity === "critical" || r.severity === "high").length,
  }), [rows]);

  const updFn = useServerFn(updateIncidentStatus);
  const mut = useMutation({
    mutationFn: updFn,
    onSuccess: (_d, v: any) => {
      toast.success(`Cập nhật → ${STATUS_LABEL[v.data.status] ?? v.data.status}`);
      qc.invalidateQueries({ queryKey: ["bql-incidents"] });
      qc.invalidateQueries({ queryKey: ["bql-security"] });
      setDetail((d) => d && d.id === v.data.id ? { ...d, status: v.data.status } : d);
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi cập nhật"),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emergency/10 text-emergency grid place-items-center">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sự cố / Incidents</h1>
          <p className="text-sm text-muted-foreground">Quản lý sự cố an ninh, kỹ thuật, môi trường.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Tổng" value={stats.total} />
        <Stat label="Mới" value={stats.open} tone="danger" />
        <Stat label="Đang điều tra" value={stats.investigating} />
        <Stat label="Đã xong" value={stats.resolved} tone="success" />
        <Stat label="Nghiêm trọng" value={stats.critical} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/40 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tiêu đề / vị trí / dự án…" className="pl-8 h-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi mức độ</SelectItem>
            {Object.entries(SEV_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setQ(""); setStatus("all"); setSeverity("all"); }}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} / {rows.length}</span>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chưa có sự cố nào.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id} className="p-3 hover:bg-muted/30 cursor-pointer flex items-start gap-3" onClick={() => setDetail(r)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{r.title}</p>
                    <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                    <span className={`text-[10px] uppercase font-semibold ${SEV_TONE[r.severity] ?? ""}`}>{SEV_LABEL[r.severity] ?? r.severity}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {r.project_name}{r.location ? ` · ${r.location}` : ""} · {new Date(r.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <Badge variant={STATUS_TONE[r.status] ?? "outline"} className="text-[10px] shrink-0">{STATUS_LABEL[r.status] ?? r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{detail.title}</SheetTitle>
                <SheetDescription className="text-[11px] font-mono">{detail.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-[13px]">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{detail.type}</Badge>
                  <span className={`text-[11px] uppercase font-semibold ${SEV_TONE[detail.severity] ?? ""}`}>{SEV_LABEL[detail.severity] ?? detail.severity}</span>
                  <Badge variant={STATUS_TONE[detail.status] ?? "outline"} className="text-[10px]">{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
                </div>
                {detail.description && <p className="text-[12px] bg-muted/40 rounded-md p-2.5">{detail.description}</p>}
                <dl className="space-y-1 text-[12px]">
                  <Row k="Dự án" v={detail.project_name} />
                  <Row k="Vị trí" v={detail.location ?? "—"} />
                  <Row k="Người báo" v={detail.reporter_name} />
                  <Row k="Phụ trách" v={detail.assigned_name} />
                  <Row k="Tạo lúc" v={new Date(detail.created_at).toLocaleString("vi-VN")} />
                  {detail.resolved_at && <Row k="Giải quyết" v={new Date(detail.resolved_at).toLocaleString("vi-VN")} />}
                </dl>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Cập nhật trạng thái</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["open", "investigating", "resolved", "closed"] as const).map((s) => (
                      <Button key={s} size="sm" variant={detail.status === s ? "default" : "outline"} className="h-7 text-[11px]"
                        disabled={mut.isPending}
                        onClick={() => mut.mutate({ data: { id: detail.id, status: s } })}>
                        {STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  return (
    <Card className="p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-0.5 ${tone === "success" ? "text-success" : tone === "danger" ? "text-emergency" : ""}`}>{value}</p>
    </Card>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>;
}
