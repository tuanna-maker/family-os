import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBqlRequests, updateServiceRequestStatus, type ServiceRequestRow } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, ClipboardList, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/bql/phan-anh")({
  head: () => ({ meta: [{ title: "Phản ánh — BQL" }] }),
  component: ServiceRequestsScreen,
});

const STATUS_LABEL: Record<string, string> = {
  open: "Mới", in_progress: "Đang xử lý", resolved: "Hoàn tất", closed: "Đã đóng",
};
const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive", in_progress: "default", resolved: "secondary", closed: "secondary",
};
const CAT_LABEL: Record<string, string> = {
  technical: "Kỹ thuật", cleaning: "Vệ sinh", security: "An ninh", billing: "Phí", maintenance: "Bảo trì", other: "Khác",
};
const PRIO_TINT: Record<string, string> = {
  low: "text-muted-foreground", normal: "text-foreground", high: "text-warning", urgent: "text-emergency",
};

function ServiceRequestsScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("__all__");
  const [cat, setCat] = useState<string>("__all__");
  const [detail, setDetail] = useState<ServiceRequestRow | null>(null);
  const qc = useQueryClient();

  const fn = useServerFn(listBqlRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-requests", projectId || "all", status],
    queryFn: () => fn({ data: {
      projectId: projectId || undefined,
      status: status !== "__all__" ? (status as any) : "all",
    } }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => rows.filter((r) => {
    if (cat !== "__all__" && r.category !== cat) return false;
    if (q.trim()) {
      const Q = q.toLowerCase();
      if (!r.title.toLowerCase().includes(Q) && !(r.apartment_code ?? "").toLowerCase().includes(Q) && !r.project_name.toLowerCase().includes(Q)) return false;
    }
    return true;
  }), [rows, q, cat]);

  const stats = useMemo(() => ({
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    resolved: rows.filter((r) => r.status === "resolved" || r.status === "closed").length,
  }), [rows]);

  const updFn = useServerFn(updateServiceRequestStatus);
  const mut = useMutation({
    mutationFn: updFn,
    onSuccess: (_d, v: any) => {
      toast.success(`Cập nhật → ${STATUS_LABEL[v.data.status] ?? v.data.status}`);
      qc.invalidateQueries({ queryKey: ["bql-requests"] });
      qc.invalidateQueries({ queryKey: ["bql-overview"] });
      setDetail((d) => d && d.id === v.data.id ? { ...d, status: v.data.status } : d);
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi cập nhật"),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Phản ánh & yêu cầu</h1>
          <p className="text-sm text-muted-foreground">Tiếp nhận, phân loại và xử lý phản ánh từ cư dân.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Tổng" value={stats.total} />
        <Stat label="Mới" value={stats.open} tone="danger" />
        <Stat label="Đang xử lý" value={stats.in_progress} />
        <Stat label="Đã xong" value={stats.resolved} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/40 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tiêu đề / căn hộ / dự án…" className="pl-8 h-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả loại</SelectItem>
            {Object.entries(CAT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setQ(""); setStatus("__all__"); setCat("__all__"); }}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} / {rows.length}</span>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Không có phản ánh nào.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id} className="p-3 hover:bg-muted/30 cursor-pointer flex items-center gap-3" onClick={() => setDetail(r)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{r.title}</p>
                    <Badge variant="outline" className="text-[10px]">{CAT_LABEL[r.category] ?? r.category}</Badge>
                    <span className={`text-[10px] uppercase font-semibold ${PRIO_TINT[r.priority] ?? ""}`}>{r.priority}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {r.project_name}{r.apartment_code ? ` · ${r.apartment_code}` : ""} · {new Date(r.created_at).toLocaleString("vi-VN")}
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
                  <Badge variant="outline">{CAT_LABEL[detail.category] ?? detail.category}</Badge>
                  <span className={`text-[11px] uppercase font-semibold ${PRIO_TINT[detail.priority] ?? ""}`}>{detail.priority}</span>
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
