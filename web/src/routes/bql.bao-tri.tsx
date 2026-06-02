import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBqlRequests, updateServiceRequestStatus, type ServiceRequestRow } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Wrench, Search, RotateCcw, Calendar, Activity, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/bql/bao-tri")({
  head: () => ({ meta: [{ title: "Bảo trì — BQL" }] }),
  component: MaintenanceScreen,
});

const STATUS_LABEL: Record<string, string> = {
  open: "Mới", in_progress: "Đang xử lý", resolved: "Đã xong", closed: "Đã đóng",
};
const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive", in_progress: "default", resolved: "secondary", closed: "outline",
};
const PRIORITY_LABEL: Record<string, string> = { low: "Thấp", normal: "Bình thường", high: "Cao", urgent: "Khẩn" };

// Static PM plan placeholder – chỉ hiển thị tham khảo, chưa lưu vào DB.
const PM_PLAN = [
  { asset: "Thang máy block A1", cycle: "Hàng tháng", next: "01/06/2026", vendor: "Otis VN" },
  { asset: "Hệ PCCC tầng hầm", cycle: "Hàng quý", next: "15/06/2026", vendor: "FireSafe Co." },
  { asset: "Máy phát điện 500KVA", cycle: "6 tháng", next: "30/08/2026", vendor: "Cummins" },
  { asset: "Hệ MEP + chiller", cycle: "Hàng quý", next: "20/06/2026", vendor: "Carrier" },
  { asset: "Bể nước mái", cycle: "6 tháng", next: "10/09/2026", vendor: "BQL nội bộ" },
];

function MaintenanceScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState<ServiceRequestRow | null>(null);
  const qc = useQueryClient();

  const fn = useServerFn(listBqlRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-maintenance", projectId || "all", status],
    queryFn: () => fn({ data: { projectId: projectId || undefined, status: status as any } }),
  });
  // Only category=maintenance
  const all = (data?.rows ?? []).filter((r) => r.category === "maintenance");
  const filtered = useMemo(() => all.filter((r) => {
    if (!q.trim()) return true;
    const Q = q.toLowerCase();
    return r.title.toLowerCase().includes(Q) || (r.apartment_code ?? "").toLowerCase().includes(Q) || r.project_name.toLowerCase().includes(Q);
  }), [all, q]);

  const stats = useMemo(() => ({
    total: all.length,
    open: all.filter((r) => r.status === "open").length,
    inProgress: all.filter((r) => r.status === "in_progress").length,
    done: all.filter((r) => r.status === "resolved" || r.status === "closed").length,
  }), [all]);

  const updFn = useServerFn(updateServiceRequestStatus);
  const mut = useMutation({
    mutationFn: updFn,
    onSuccess: (_d, v: any) => {
      toast.success(`Cập nhật → ${STATUS_LABEL[v.data.status] ?? v.data.status}`);
      qc.invalidateQueries({ queryKey: ["bql-maintenance"] });
      setDetail((d) => d && d.id === v.data.id ? { ...d, status: v.data.status } : d);
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi cập nhật"),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bảo trì tài sản</h1>
          <p className="text-sm text-muted-foreground">Yêu cầu bảo trì + kế hoạch PM định kỳ.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<Wrench className="h-4 w-4" />} label="Tổng yêu cầu" value={stats.total} />
        <Stat icon={<Activity className="h-4 w-4" />} label="Mới" value={stats.open} tone="danger" />
        <Stat icon={<Activity className="h-4 w-4" />} label="Đang xử lý" value={stats.inProgress} />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Hoàn tất" value={stats.done} tone="success" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 overflow-hidden">
          <div className="p-3 border-b flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold mr-2">Yêu cầu bảo trì</h2>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tiêu đề / căn / dự án…" className="pl-8 h-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi trạng thái</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setQ(""); setStatus("all"); }}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Chưa có yêu cầu bảo trì.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} className="p-3 hover:bg-muted/30 cursor-pointer flex items-start gap-3" onClick={() => setDetail(r)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {r.project_name}{r.apartment_code ? ` · ${r.apartment_code}` : ""} · {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{PRIORITY_LABEL[r.priority] ?? r.priority}</Badge>
                  <Badge variant={STATUS_TONE[r.status] ?? "outline"} className="text-[10px] shrink-0">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2 p-4">
          <h2 className="text-sm font-semibold flex items-center gap-1.5 mb-3"><Calendar className="h-4 w-4" /> Kế hoạch PM định kỳ</h2>
          <ul className="space-y-2">
            {PM_PLAN.map((p) => (
              <li key={p.asset} className="border rounded-lg p-2.5 text-[12px]">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium truncate">{p.asset}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">{p.cycle}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Kế tiếp: <span className="font-medium text-foreground">{p.next}</span> · {p.vendor}</p>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground italic mt-3">* Dữ liệu mẫu — sẽ kết nối module quản lý tài sản ở Phase 3.</p>
        </Card>
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{detail.title}</SheetTitle>
                <SheetDescription className="text-[11px] font-mono">{detail.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-[13px]">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Bảo trì</Badge>
                  <Badge variant="outline">{PRIORITY_LABEL[detail.priority] ?? detail.priority}</Badge>
                  <Badge variant={STATUS_TONE[detail.status] ?? "outline"} className="text-[10px]">{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
                </div>
                <dl className="space-y-1 text-[12px]">
                  <Row k="Dự án" v={detail.project_name} />
                  <Row k="Căn hộ" v={detail.apartment_code ?? "—"} />
                  <Row k="Tạo lúc" v={new Date(detail.created_at).toLocaleString("vi-VN")} />
                  {detail.resolved_at && <Row k="Hoàn tất" v={new Date(detail.resolved_at).toLocaleString("vi-VN")} />}
                </dl>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Cập nhật trạng thái</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
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

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "success" | "danger" }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">{icon}{label}</div>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${tone === "success" ? "text-success" : tone === "danger" ? "text-emergency" : ""}`}>{value}</p>
    </Card>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>;
}
