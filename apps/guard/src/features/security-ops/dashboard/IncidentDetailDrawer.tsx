import { useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@shared/ui/ui/sheet";
import { Button } from "@shared/ui/ui/button";
import { Label } from "@shared/ui/ui/label";
import { Textarea } from "@shared/ui/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/ui/ui/select";
import { Separator } from "@shared/ui/ui/separator";
import {
  MapPin, Radio, Clock, CheckCircle2, AlertTriangle, UserCog, Send, Siren,
} from "lucide-react";
import { toast } from "sonner";

export type IncidentStatus = "new" | "assigned" | "in_progress" | "resolved";
export type IncidentPriority = "P1" | "P2" | "P3";

export type Incident = {
  id: string;
  priority: IncidentPriority;
  type: string;
  location: string;
  reportedAt: string;
  status: IncidentStatus;
  assignee?: string;
};

const PRIO_CLS: Record<IncidentPriority, string> = {
  P1: "bg-red-500/20 text-red-300 border-red-500/40",
  P2: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  P3: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

const STATUS_META: Record<IncidentStatus, { label: string; cls: string; icon: typeof Clock }> = {
  new: { label: "Chưa gán", cls: "text-red-300", icon: AlertTriangle },
  assigned: { label: "Đã gán", cls: "text-amber-300", icon: Clock },
  in_progress: { label: "Đang xử lý", cls: "text-sky-300", icon: Radio },
  resolved: { label: "Hoàn thành", cls: "text-emerald-300", icon: CheckCircle2 },
};

const GUARDS = [
  { id: "G-007", name: "Phạm Quốc Đạt" },
  { id: "G-014", name: "Trần Văn Hùng" },
  { id: "G-019", name: "Vũ Bá Khánh" },
  { id: "G-021", name: "Lê Minh Tuấn" },
  { id: "G-028", name: "Đỗ Tuấn Anh" },
  { id: "G-033", name: "Nguyễn Thị Hoa" },
];

type TimelineEvent = {
  at: string;
  actor: string;
  label: string;
  tone: "info" | "warn" | "ok" | "crit";
  note?: string;
};

function seedTimeline(i: Incident): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { at: i.reportedAt + " trước", actor: "Hệ thống", label: "Tiếp nhận sự cố", tone: "crit", note: `${i.type} @ ${i.location}` },
  ];
  if (i.status !== "new") {
    events.push({ at: "—", actor: "Điều phối viên", label: `Gán cho ${i.assignee ?? "—"}`, tone: "warn" });
  }
  if (i.status === "in_progress" || i.status === "resolved") {
    events.push({ at: "—", actor: i.assignee ?? "—", label: "Đến hiện trường, bắt đầu xử lý", tone: "info" });
  }
  if (i.status === "resolved") {
    events.push({ at: "—", actor: i.assignee ?? "—", label: "Hoàn tất xử lý", tone: "ok", note: "Đã lập biên bản" });
  }
  return events;
}

const TONE_DOT: Record<TimelineEvent["tone"], string> = {
  info: "bg-sky-400",
  warn: "bg-amber-400",
  ok: "bg-emerald-400",
  crit: "bg-red-400",
};

export function IncidentDetailDrawer({
  incident,
  open,
  onOpenChange,
  onUpdate,
}: {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (next: Incident) => void;
}) {
  const [status, setStatus] = useState<IncidentStatus>("new");
  const [assignee, setAssignee] = useState<string>("");
  const [note, setNote] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!incident) return;
    setStatus(incident.status);
    setAssignee(incident.assignee ?? "");
    setNote("");
    setEvents(seedTimeline(incident));
  }, [incident?.id]);

  const meta = useMemo(() => incident && STATUS_META[status], [incident, status]);
  const dirty = incident
    ? status !== incident.status || (assignee || "") !== (incident.assignee ?? "") || note.trim().length > 0
    : false;

  if (!incident) return null;

  const handleSave = () => {
    const stamp = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const newEvents: TimelineEvent[] = [];
    if (assignee && assignee !== (incident.assignee ?? "")) {
      newEvents.push({ at: stamp, actor: "Bạn", label: `Gán cho ${assignee}`, tone: "warn" });
    }
    if (status !== incident.status) {
      newEvents.push({ at: stamp, actor: "Bạn", label: `Cập nhật trạng thái → ${STATUS_META[status].label}`, tone: status === "resolved" ? "ok" : "info" });
    }
    if (note.trim()) {
      newEvents.push({ at: stamp, actor: "Bạn", label: "Ghi chú", tone: "info", note: note.trim() });
    }
    setEvents((prev) => [...newEvents, ...prev]);
    onUpdate?.({ ...incident, status, assignee: assignee || undefined });
    toast.success(`Đã cập nhật ${incident.id}`);
    setNote("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${PRIO_CLS[incident.priority]}`}>
              {incident.priority}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
            {meta && (
              <span className={`ml-auto flex items-center gap-1 text-[11px] ${meta.cls}`}>
                <meta.icon className="h-3.5 w-3.5" /> {meta.label}
              </span>
            )}
          </div>
          <SheetTitle className="flex items-center gap-2">
            <Siren className="h-4 w-4 text-red-500" />
            {incident.type}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {incident.location} · báo cách đây {incident.reportedAt}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Location block */}
        <div className="rounded-lg border bg-muted/30 p-3 mb-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Vị trí</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Khu</div>
              <div className="font-medium">{incident.location.split(" · ")[0] ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Điểm</div>
              <div className="font-medium">{incident.location.split(" · ")[1] ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Camera</div>
              <div className="font-medium">CAM-{incident.id.slice(-3)}</div>
            </div>
          </div>
        </div>

        {/* Update form */}
        <div className="space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Trạng thái</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as IncidentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as IncidentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><UserCog className="h-3 w-3" /> Nhân sự</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {GUARDS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.id} · {g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ghi chú / cập nhật</Label>
            <Textarea rows={2} placeholder="Thêm cập nhật vào timeline..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Timeline</div>
          <ol className="relative border-l border-border pl-4 space-y-3">
            {events.map((ev, idx) => (
              <li key={idx} className="relative">
                <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${TONE_DOT[ev.tone]} ring-2 ring-background`} />
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium">{ev.label}</span>
                  <span className="text-[10px] text-muted-foreground">{ev.at}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{ev.actor}{ev.note ? ` · ${ev.note}` : ""}</div>
              </li>
            ))}
          </ol>
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button onClick={handleSave} disabled={!dirty} className="gap-2">
            <Send className="h-4 w-4" /> Cập nhật
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
