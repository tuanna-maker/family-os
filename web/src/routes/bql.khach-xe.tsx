import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBqlVisitorPasses, updateVisitorPassStatus, type VisitorPassRow } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, QrCode, RotateCcw, CheckCircle2, XCircle, Car } from "lucide-react";

export const Route = createFileRoute("/bql/khach-xe")({
  head: () => ({ meta: [{ title: "Khách & xe — BQL" }] }),
  component: VisitorsScreen,
});

const STATUS_LABEL: Record<string, string> = {
  active: "Hiệu lực", used: "Đã dùng", expired: "Hết hạn", cancelled: "Đã huỷ",
};
const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", used: "secondary", expired: "outline", cancelled: "destructive",
};

function VisitorsScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [detail, setDetail] = useState<VisitorPassRow | null>(null);
  const qc = useQueryClient();

  const fn = useServerFn(listBqlVisitorPasses);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-visitor-passes", projectId || "all", status],
    queryFn: () => fn({ data: { projectId: projectId || undefined, status } }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => rows.filter((r) => {
    if (!q.trim()) return true;
    const Q = q.toLowerCase();
    return r.guest_name.toLowerCase().includes(Q) ||
      (r.vehicle_plate ?? "").toLowerCase().includes(Q) ||
      (r.pass_code ?? "").toLowerCase().includes(Q) ||
      (r.apartment_code ?? "").toLowerCase().includes(Q);
  }), [rows, q]);

  const now = Date.now();
  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === "active" && new Date(r.valid_until).getTime() > now).length,
    used: rows.filter((r) => r.status === "used").length,
    with_vehicle: rows.filter((r) => !!r.vehicle_plate).length,
  }), [rows, now]);

  const updFn = useServerFn(updateVisitorPassStatus);
  const mut = useMutation({
    mutationFn: updFn,
    onSuccess: (_d, v: any) => {
      toast.success(`Cập nhật → ${STATUS_LABEL[v.data.status] ?? v.data.status}`);
      qc.invalidateQueries({ queryKey: ["bql-visitor-passes"] });
      setDetail((d) => d && d.id === v.data.id ? { ...d, status: v.data.status } : d);
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi cập nhật"),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Khách & xe ra/vào</h1>
          <p className="text-sm text-muted-foreground">QR khách, biển số xe, duyệt / huỷ pass.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Tổng pass" value={stats.total} />
        <Stat label="Đang hiệu lực" value={stats.active} tone="success" />
        <Stat label="Đã quét" value={stats.used} />
        <Stat label="Có xe" value={stats.with_vehicle} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/40 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm khách / biển số / mã QR / căn…" className="pl-8 h-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-muted-foreground" onClick={() => { setQ(""); setStatus("all"); }}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} / {rows.length}</span>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chưa có pass khách nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-2.5">Khách</th>
                  <th className="text-left p-2.5">Mã pass</th>
                  <th className="text-left p-2.5">Xe</th>
                  <th className="text-left p-2.5">Căn / Dự án</th>
                  <th className="text-left p-2.5">Hiệu lực</th>
                  <th className="text-left p-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="p-2.5">
                      <p className="font-medium">{r.guest_name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.guest_phone ?? "—"}</p>
                    </td>
                    <td className="p-2.5 font-mono text-[11px]">{r.pass_code.slice(0, 12)}</td>
                    <td className="p-2.5">
                      {r.vehicle_plate ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-mono"><Car className="h-3 w-3" />{r.vehicle_plate}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-2.5 text-[12px]">
                      <div>{r.apartment_code ?? "—"}</div>
                      <div className="text-muted-foreground text-[11px]">{r.project_name}</div>
                    </td>
                    <td className="p-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(r.valid_from).toLocaleDateString("vi-VN")}<br />→ {new Date(r.valid_until).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-2.5"><Badge variant={STATUS_TONE[r.status] ?? "outline"} className="text-[10px]">{STATUS_LABEL[r.status] ?? r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{detail.guest_name}</SheetTitle>
                <SheetDescription className="text-[11px] font-mono">{detail.pass_code}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border bg-muted/30 p-6 text-center">
                  <QrCode className="h-20 w-20 mx-auto text-foreground" />
                  <p className="font-mono text-[12px] mt-2">{detail.pass_code}</p>
                  <Badge variant={STATUS_TONE[detail.status] ?? "outline"} className="mt-2 text-[10px]">{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
                </div>
                <dl className="space-y-1.5 text-[12px]">
                  <Row k="Khách" v={`${detail.guest_name}${detail.guest_phone ? ` · ${detail.guest_phone}` : ""}`} />
                  <Row k="Chủ hộ tiếp" v={detail.host_name} />
                  <Row k="Căn hộ" v={detail.apartment_code ?? "—"} />
                  <Row k="Dự án" v={detail.project_name} />
                  <Row k="Biển số xe" v={detail.vehicle_plate ?? "—"} />
                  <Row k="Mục đích" v={detail.purpose ?? "—"} />
                  <Row k="Hiệu lực từ" v={new Date(detail.valid_from).toLocaleString("vi-VN")} />
                  <Row k="Đến" v={new Date(detail.valid_until).toLocaleString("vi-VN")} />
                  {detail.scanned_at && <Row k="Đã quét" v={new Date(detail.scanned_at).toLocaleString("vi-VN")} />}
                </dl>

                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Hành động</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.status !== "used" && (
                      <Button size="sm" className="h-8 text-[11px] gap-1" disabled={mut.isPending}
                        onClick={() => mut.mutate({ data: { id: detail.id, status: "used" } })}>
                        <CheckCircle2 className="h-3 w-3" /> Đánh dấu đã quét
                      </Button>
                    )}
                    {detail.status !== "cancelled" && (
                      <Button size="sm" variant="destructive" className="h-8 text-[11px] gap-1" disabled={mut.isPending}
                        onClick={() => mut.mutate({ data: { id: detail.id, status: "cancelled" } })}>
                        <XCircle className="h-3 w-3" /> Huỷ pass
                      </Button>
                    )}
                    {detail.status !== "active" && (
                      <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={mut.isPending}
                        onClick={() => mut.mutate({ data: { id: detail.id, status: "active" } })}>
                        Kích hoạt lại
                      </Button>
                    )}
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
