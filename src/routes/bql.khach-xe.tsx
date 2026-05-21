import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useScopedCollection, svc } from "@/lib/services";
import { useCollection } from "@/mock-data/store";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { hasPermission } from "@/constants/permissions";
import type { Visitor, AccessLog, Apartment } from "@/types/core";
import { CrudScreen, type CrudConfig } from "@/components/core/CrudScreen";
import { StatusBadge } from "@/components/core/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QrCode, ScanLine, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/bql/khach-xe")({
  head: () => ({ meta: [{ title: "Khách & QR — BQL" }] }),
  component: VisitorsScreen,
});

const PURPOSE_LABEL: Record<Visitor["purpose"], string> = {
  guest: "Khách thăm", delivery: "Giao hàng", service: "Dịch vụ", family: "Người nhà", other: "Khác",
};

function VisitorsScreen() {
  const { user } = useMockAuth();
  const visitors = useScopedCollection<Visitor>("visitors");
  const logs = useCollection<AccessLog>("access_logs");
  const apartments = useCollection<Apartment>("apartments");
  const aptMap = useMemo(() => new Map(apartments.map((a) => [a.id, a.code])), [apartments]);
  const [scanOpen, setScanOpen] = useState(false);

  const canScan = hasPermission(user?.role, "visitor.scan");
  const canApprove = hasPermission(user?.role, "visitor.approve");

  const config: CrudConfig<Visitor> = {
    collection: "visitors",
    entityLabel: "Khách",
    entityLabelPlural: "khách",
    idPrefix: "vis",
    permissions: { view: "visitor.view", create: "visitor.create", edit: "visitor.approve", delete: "visitor.approve" },
    searchKeys: ["visitorName", "visitorPhone", "vehiclePlate", "qrCode", "hostName"],
    filters: [
      { key: "status", label: "Trạng thái", options: [
        { value: "pending", label: "Chờ duyệt" }, { value: "active", label: "Đang hiệu lực" },
        { value: "used", label: "Đã dùng" }, { value: "expired", label: "Hết hạn" }, { value: "cancelled", label: "Huỷ" },
      ]},
      { key: "purpose", label: "Mục đích", options: Object.entries(PURPOSE_LABEL).map(([v, l]) => ({ value: v, label: l })) },
    ],
    columns: [
      { key: "visitorName", label: "Khách" },
      { key: "hostName", label: "Chủ hộ tiếp" },
      { key: "apartmentId", label: "Căn", render: (r) => aptMap.get(r.apartmentId) ?? "—" },
      { key: "purpose", label: "Mục đích", render: (r) => PURPOSE_LABEL[r.purpose] },
      { key: "vehiclePlate", label: "Biển số", render: (r) => r.vehiclePlate ?? "—" },
      { key: "validTo", label: "Hết hạn", render: (r) => new Date(r.validTo).toLocaleString("vi-VN") },
      { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
      { key: "qrCode", label: "QR", render: (r) => <span className="font-mono text-[11px]">{r.qrCode}</span> },
    ],
    fields: [
      { key: "visitorName", label: "Tên khách", required: true },
      { key: "visitorPhone", label: "Điện thoại" },
      { key: "vehiclePlate", label: "Biển số xe" },
      { key: "apartmentId", label: "Căn hộ tiếp", type: "select", required: true,
        options: apartments.map((a) => ({ value: a.id, label: a.code })) },
      { key: "hostName", label: "Tên chủ hộ", required: true },
      { key: "purpose", label: "Mục đích", type: "select", required: true,
        options: Object.entries(PURPOSE_LABEL).map(([v, l]) => ({ value: v, label: l })) },
      { key: "validFrom", label: "Hiệu lực từ (ISO)", required: true },
      { key: "validTo", label: "Hiệu lực đến (ISO)", required: true },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: [
        { value: "pending", label: "Chờ duyệt" }, { value: "active", label: "Đang hiệu lực" },
        { value: "used", label: "Đã dùng" }, { value: "expired", label: "Hết hạn" }, { value: "cancelled", label: "Huỷ" },
      ]},
    ],
    defaults: { status: "pending", purpose: "guest", qrCode: `STOS-QR-${Math.random().toString(36).slice(2, 8).toUpperCase()}` },
    detail: (v) => (
      <div className="space-y-3">
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <QrCode className="h-20 w-20 mx-auto text-foreground" />
          <p className="font-mono text-[13px] mt-2">{v.qrCode}</p>
          <Badge variant="outline" className="mt-2"><StatusBadge status={v.status} /></Badge>
        </div>
        <dl className="space-y-1.5 text-[12px]">
          <Row k="Khách" v={`${v.visitorName} · ${v.visitorPhone ?? "—"}`} />
          <Row k="Chủ hộ" v={v.hostName} />
          <Row k="Căn hộ" v={aptMap.get(v.apartmentId) ?? "—"} />
          <Row k="Mục đích" v={PURPOSE_LABEL[v.purpose]} />
          <Row k="Biển số" v={v.vehiclePlate ?? "—"} />
          <Row k="Hiệu lực" v={`${new Date(v.validFrom).toLocaleString("vi-VN")} → ${new Date(v.validTo).toLocaleString("vi-VN")}`} />
        </dl>
        <div>
          <h4 className="font-semibold text-[12px] mb-1.5">Lịch sử ra/vào</h4>
          <ul className="space-y-1 text-[11px]">
            {logs.filter((l) => l.visitorId === v.id).map((l) => (
              <li key={l.id} className="flex justify-between rounded border p-1.5">
                <span>{l.direction === "in" ? "→ Vào" : "← Ra"} {l.gate}</span>
                <span className="text-muted-foreground">{new Date(l.at).toLocaleString("vi-VN")}</span>
              </li>
            ))}
            {logs.filter((l) => l.visitorId === v.id).length === 0 && <li className="text-muted-foreground italic">Chưa có log</li>}
          </ul>
        </div>
        {canApprove && v.status === "pending" && (
          <Button size="sm" className="w-full" onClick={() => { svc.update<Visitor>("visitors", v.id, { status: "active" }); toast.success("Đã duyệt khách"); }}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Duyệt khách
          </Button>
        )}
      </div>
    ),
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-0 flex justify-between items-center">
        <div />
        {canScan && (
          <Button size="sm" variant="outline" onClick={() => setScanOpen(true)} className="gap-1.5">
            <ScanLine className="h-4 w-4" /> Giả lập Guard scan
          </Button>
        )}
      </div>
      <CrudScreen<Visitor> config={config} rows={visitors} title="Khách & QR ra vào" subtitle="QR tạm thời, log ra/vào, duyệt khách thăm." />
      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} visitors={visitors} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>;
}

function ScanDialog({ open, onOpenChange, visitors }: { open: boolean; onOpenChange: (o: boolean) => void; visitors: Visitor[] }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  function scan() {
    const v = visitors.find((x) => x.qrCode === code.trim().toUpperCase());
    if (!v) { setResult("❌ QR không tồn tại"); return; }
    if (v.status === "expired" || v.status === "cancelled") { setResult(`❌ QR đã ${v.status}`); return; }
    if (new Date(v.validTo) < new Date()) {
      svc.update<Visitor>("visitors", v.id, { status: "expired" });
      setResult("❌ QR hết hạn");
      return;
    }
    svc.create<AccessLog>("access_logs", "alog", {
      tenantId: v.tenantId, projectId: v.projectId, visitorId: v.id, apartmentId: v.apartmentId,
      gate: "Cổng chính", direction: "in", scannedByName: "Bảo vệ (demo)", at: new Date().toISOString(),
    } as any);
    svc.update<Visitor>("visitors", v.id, { status: "used" });
    setResult(`✅ ${v.visitorName} → căn ${v.apartmentId}. Đã ghi access log.`);
    toast.success("Scan thành công");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Guard scan QR (demo)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Nhập mã QR…"
            className="w-full h-10 rounded-md border bg-background px-3 font-mono text-sm" />
          {result && <p className="text-sm rounded-md bg-muted p-2">{result}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCode(""); setResult(null); onOpenChange(false); }}>Đóng</Button>
          <Button onClick={scan} disabled={!code.trim()}>Scan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
