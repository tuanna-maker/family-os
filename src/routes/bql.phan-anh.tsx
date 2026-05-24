import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useScopedCollection, svc } from "@/lib/services";
import { useCollection } from "@/mock-data/store";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { hasPermission } from "@/constants/permissions";
import type { ServiceRequest, ServiceRequestStatus, Apartment, Staff, ServiceRequestNote } from "@/types/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ClipboardList, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/core/States";

export const Route = createFileRoute("/bql/phan-anh")({
  head: () => ({ meta: [{ title: "Phản ánh — BQL" }] }),
  component: ServiceRequestsScreen,
});

const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  new: "Mới", in_progress: "Đang xử lý", waiting_resident: "Chờ cư dân", resolved: "Hoàn tất", closed: "Đã đóng",
};
const STATUS_TONE: Record<ServiceRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "destructive", in_progress: "default", waiting_resident: "outline", resolved: "secondary", closed: "secondary",
};
const CAT_LABEL: Record<string, string> = {
  technical: "Kỹ thuật", cleaning: "Vệ sinh", security: "An ninh", billing: "Phí", other: "Khác",
};
const PRIO_TINT: Record<string, string> = {
  low: "text-muted-foreground", normal: "text-foreground", high: "text-warning", urgent: "text-emergency",
};

function ServiceRequestsScreen() {
  const { user } = useMockAuth();
  const rows = useScopedCollection<ServiceRequest>("service_requests");
  const apartments = useCollection<Apartment>("apartments");
  const staff = useCollection<Staff>("staff");
  const aptMap = useMemo(() => new Map(apartments.map((a) => [a.id, a.code])), [apartments]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("__all__");
  const [cat, setCat] = useState<string>("__all__");
  const [detail, setDetail] = useState<ServiceRequest | null>(null);

  const canAssign = hasPermission(user?.role, "service_request.assign");
  const canResolve = hasPermission(user?.role, "service_request.resolve");

  const filtered = rows.filter((r) => {
    if (status !== "__all__" && r.status !== status) return false;
    if (cat !== "__all__" && r.category !== cat) return false;
    if (q.trim()) { const Q = q.toLowerCase(); if (!r.title.toLowerCase().includes(Q) && !r.residentName?.toLowerCase().includes(Q)) return false; }
    return true;
  });

  function setStatusOf(r: ServiceRequest, s: ServiceRequestStatus) {
    const note: ServiceRequestNote = {
      id: `t-${Date.now()}`, authorId: user!.id, authorName: user!.fullName, authorRole: user!.role,
      body: `Chuyển trạng thái: ${STATUS_LABEL[s]}`, at: new Date().toISOString(),
    };
    svc.update<ServiceRequest>("service_requests", r.id, {
      status: s, timeline: [...r.timeline, note], resolvedAt: s === "resolved" ? new Date().toISOString() : r.resolvedAt,
    });
    toast.success(`Cập nhật → ${STATUS_LABEL[s]}`);
    setDetail((d) => d && d.id === r.id ? { ...d, status: s, timeline: [...d.timeline, note] } : d);
  }

  function assign(r: ServiceRequest, staffId: string) {
    const s = staff.find((x) => x.id === staffId);
    if (!s) return;
    const note: ServiceRequestNote = {
      id: `t-${Date.now()}`, authorId: user!.id, authorName: user!.fullName, authorRole: user!.role,
      body: `Giao cho ${s.fullName}`, at: new Date().toISOString(),
    };
    svc.update<ServiceRequest>("service_requests", r.id, {
      assignedStaffId: s.id, assignedStaffName: s.fullName, status: "in_progress",
      timeline: [...r.timeline, note],
    });
    toast.success(`Đã giao việc cho ${s.fullName}`);
    setDetail((d) => d && d.id === r.id ? { ...d, assignedStaffId: s.id, assignedStaffName: s.fullName, status: "in_progress", timeline: [...d.timeline, note] } : d);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Phản ánh & yêu cầu</h1>
          <p className="text-xs text-muted-foreground">Tiếp nhận, phân loại, giao việc và xử lý phản ánh từ cư dân.</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/40 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tiêu đề / cư dân…" className="pl-8 h-9" />
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

      {filtered.length === 0 ? <EmptyState title="Không có phản ánh" hint="Thử bỏ bộ lọc." /> : (
        <ul className="divide-y rounded-xl border bg-card">
          {filtered.map((r) => (
            <li key={r.id} className="p-3 hover:bg-muted/30 cursor-pointer flex items-center gap-3" onClick={() => setDetail(r)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  <Badge variant="outline" className="text-[10px]">{CAT_LABEL[r.category]}</Badge>
                  <span className={`text-[10px] uppercase font-semibold ${PRIO_TINT[r.priority]}`}>{r.priority}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r.residentName} · {aptMap.get(r.apartmentId ?? "") ?? "—"} · {new Date(r.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <Badge variant={STATUS_TONE[r.status]} className="text-[10px] shrink-0">{STATUS_LABEL[r.status]}</Badge>
            </li>
          ))}
        </ul>
      )}

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
                  <Badge variant="outline">{CAT_LABEL[detail.category]}</Badge>
                  <span className={`text-[11px] uppercase font-semibold ${PRIO_TINT[detail.priority]}`}>{detail.priority}</span>
                  <Badge variant={STATUS_TONE[detail.status]} className="text-[10px]">{STATUS_LABEL[detail.status]}</Badge>
                </div>
                <p className="rounded-md bg-muted/50 p-3 text-[12px]">{detail.description}</p>
                <dl className="space-y-1 text-[12px]">
                  <Row k="Cư dân" v={`${detail.residentName ?? "—"} · ${aptMap.get(detail.apartmentId ?? "") ?? "—"}`} />
                  <Row k="Phụ trách" v={detail.assignedStaffName ?? "— chưa giao —"} />
                  <Row k="Tạo lúc" v={new Date(detail.createdAt).toLocaleString("vi-VN")} />
                  {detail.resolvedAt && <Row k="Hoàn tất" v={new Date(detail.resolvedAt).toLocaleString("vi-VN")} />}
                </dl>

                {canAssign && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Giao việc cho nhân viên</p>
                    <Select value={detail.assignedStaffId ?? ""} onValueChange={(v) => assign(detail, v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Chọn nhân viên…" /></SelectTrigger>
                      <SelectContent>
                        {staff.filter((s) => s.projectId === detail.projectId).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.fullName} · {s.position}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {canResolve && (
                  <div className="flex flex-wrap gap-1.5">
                    {(["new", "in_progress", "waiting_resident", "resolved", "closed"] as const).map((s) => (
                      <Button key={s} size="sm" variant={detail.status === s ? "default" : "outline"} className="h-7 text-[11px]"
                        onClick={() => setStatusOf(detail, s)}>
                        {STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-[12px] mb-1.5">Timeline</h4>
                  <ol className="space-y-2 relative border-l pl-3">
                    {detail.timeline.map((t) => (
                      <li key={t.id} className="text-[12px]">
                        <div className="absolute -left-1 mt-1.5 h-2 w-2 rounded-full bg-primary" />
                        <p>{t.body}</p>
                        <p className="text-[10px] text-muted-foreground">{t.authorName} · {t.authorRole} · {new Date(t.at).toLocaleString("vi-VN")}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>;
}
