import { useEffect, useMemo, useState } from "react";
import { Siren, Send, MapPin, AlertOctagon, Sparkles, RotateCcw, CheckCircle2, Copy } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@shared/ui/ui/dialog";
import { Button } from "@shared/ui/ui/button";
import { Label } from "@shared/ui/ui/label";
import { Input } from "@shared/ui/ui/input";
import { Textarea } from "@shared/ui/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/ui/ui/select";
import { toast } from "sonner";
import { createSosDispatch } from "@/api/security";
import { addDispatch, ALL_TEAMS, suggestTeam, type DispatchPriority } from "./dispatchStore";
import { validateSosDispatch, SOS_SCHEMA_VERSION } from "./sosSchema";

type Priority = DispatchPriority;

const INCIDENT_TYPES = [
  { value: "fire", label: "Cháy / Khói" },
  { value: "intrusion", label: "Xâm nhập trái phép" },
  { value: "medical", label: "Cấp cứu y tế" },
  { value: "fight", label: "Ẩu đả / Gây rối" },
  { value: "theft", label: "Trộm cắp" },
  { value: "vehicle", label: "Sự cố bãi xe" },
  { value: "flood", label: "Ngập / Rò rỉ nước" },
  { value: "other", label: "Khác" },
];

const ZONES = [
  "Cổng chính", "Lobby A", "Lobby B", "Tháp A", "Tháp B",
  "Tầng hầm B1", "Tầng hầm B2", "Sảnh sự kiện", "Bãi xe ngoài",
];

const GUARD_TEAMS = ALL_TEAMS;

const PRIORITY_META: Record<Priority, { label: string; sub: string; cls: string; sla: string }> = {
  P1: { label: "P1 · Khẩn cấp", sub: "Đe doạ tính mạng / tài sản lớn", cls: "border-red-500/60 bg-red-500/15 text-red-200", sla: "SLA 2 phút" },
  P2: { label: "P2 · Cao", sub: "Cần xử lý ngay trong ca", cls: "border-amber-500/60 bg-amber-500/15 text-amber-200", sla: "SLA 10 phút" },
  P3: { label: "P3 · Thường", sub: "Theo dõi và xử lý tuần tự", cls: "border-sky-500/60 bg-sky-500/15 text-sky-200", sla: "SLA 30 phút" },
};

export function SosDispatchButton() {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<Priority>("P1");
  const [type, setType] = useState<string>("");
  const [zone, setZone] = useState<string>("");
  const [team, setTeam] = useState<string>("");
  const [autoAssigned, setAutoAssigned] = useState(true);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<{ code: string; priority: Priority; typeLabel: string; zone: string; teamName: string } | null>(null);

  // Auto-suggest team whenever zone or priority changes (unless user overrode)
  useEffect(() => {
    if (!zone) return;
    if (!autoAssigned) return;
    const sug = suggestTeam(zone, priority);
    setTeam(sug.id);
  }, [zone, priority, autoAssigned]);

  const canSubmit = useMemo(
    () => Boolean(type && zone && team && !submitting),
    [type, zone, team, submitting],
  );

  const reset = () => {
    setPriority("P1"); setType(""); setZone(""); setTeam(""); setLocation(""); setNote(""); setAutoAssigned(true);
  };

  
  const handleDispatch = async () => {
    const typeLabel = INCIDENT_TYPES.find((t) => t.value === type)?.label ?? type;
    const teamObj = GUARD_TEAMS.find((t) => t.id === team);
    if (!teamObj) {
      toast.error("Vui lòng chọn đội điều động");
      return;
    }

    // Pre-submit validation (trim + schema_version check)
    const check = validateSosDispatch({
      schema_version: SOS_SCHEMA_VERSION,
      priority,
      incident_type: typeLabel,
      zone,
      location,
      team_id: teamObj.id,
      team_name: teamObj.name,
      auto_assigned: autoAssigned,
      note,
    });
    if (!check.ok) {
      toast.error("Dữ liệu SOS chưa hợp lệ", {
        description: check.field ? `${check.field}: ${check.message}` : check.message,
      });
      return;
    }
    const payload = check.data;

    setSubmitting(true);
    try {
      const res = await createSosDispatch(payload);
      addDispatch({
        id: res.ticket_code,
        priority: payload.priority,
        incidentType: payload.incident_type,
        zone: payload.zone,
        location: payload.location,
        teamId: payload.team_id,
        teamName: payload.team_name,
        autoAssigned: payload.auto_assigned,
        note: payload.note,
      });
      toast.success(`Đã tạo ticket ${res.ticket_code}`, {
        description: `${payload.priority} · ${payload.incident_type} · ${payload.zone} → ${payload.team_name}`,
      });
      setLastTicket({
        code: res.ticket_code,
        priority: payload.priority,
        typeLabel: payload.incident_type,
        zone: payload.zone,
        teamName: payload.team_name,
      });
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      toast.error("Gửi điều động thất bại", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const copyTicket = async () => {
    if (!lastTicket) return;
    try {
      await navigator.clipboard.writeText(lastTicket.code);
      toast.success("Đã sao chép mã ticket");
    } catch {
      toast.error("Không sao chép được");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLastTicket(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 border border-red-400/40"
          size="sm"
        >
          <Siren className="h-4 w-4" />
          Điều phối SOS
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-red-500" />
            Điều phối SOS
          </DialogTitle>
          <DialogDescription>
            {lastTicket
              ? "Ticket đã được tạo. Sao chép mã để theo dõi hoặc tạo điều động mới."
              : "Chọn loại sự cố, mức ưu tiên và đội trực để gửi điều động ngay."}
          </DialogDescription>
        </DialogHeader>

        {lastTicket && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300 text-[12px] font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Đã gửi điều động thành công
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-background/60 border border-border px-3 py-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mã ticket</div>
                <div className="font-mono text-base font-semibold tracking-wide">{lastTicket.code}</div>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={copyTicket}>
                <Copy className="h-3.5 w-3.5" /> Sao chép
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {lastTicket.priority} · {lastTicket.typeLabel} · {lastTicket.zone} → {lastTicket.teamName}
            </div>
          </div>
        )}



        <div className="space-y-4">
          {/* Priority */}
          <div className="space-y-2">
            <Label>Mức ưu tiên</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["P1", "P2", "P3"] as Priority[]).map((p) => {
                const meta = PRIORITY_META[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`text-left rounded-lg border px-3 py-2 transition ${
                      active ? meta.cls : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">{meta.sla}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">{PRIORITY_META[priority].sub}</p>
          </div>

          {/* Incident type */}
          <div className="space-y-2">
            <Label>Loại sự cố</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Chọn loại sự cố..." /></SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone + location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Khu vực</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger><SelectValue placeholder="Chọn khu vực" /></SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vị trí cụ thể</Label>
              <Input
                placeholder="VD: L05, ô C12..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Team */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                Đội điều động
                {autoAssigned && team && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 border border-sky-500/30">
                    <Sparkles className="h-2.5 w-2.5" /> Tự động
                  </span>
                )}
              </Label>
              {!autoAssigned && zone && (
                <button
                  type="button"
                  onClick={() => setAutoAssigned(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Gợi ý lại
                </button>
              )}
            </div>
            <Select value={team} onValueChange={(v) => { setTeam(v); setAutoAssigned(false); }}>
              <SelectTrigger><SelectValue placeholder={zone ? "Đang gợi ý..." : "Chọn khu vực trước"} /></SelectTrigger>
              <SelectContent>
                {GUARD_TEAMS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {autoAssigned && team && zone && (
              <p className="text-[11px] text-muted-foreground">
                Gán theo khu vực {zone}{priority === "P1" ? " · ưu tiên P1" : ""}.
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Ghi chú (tuỳ chọn)</Label>
            <Textarea
              rows={2}
              placeholder="Mô tả ngắn cho đội trực..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {(zone || location) && (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground border-t pt-3">
              <MapPin className="h-3.5 w-3.5" />
              {[zone, location].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {lastTicket ? (
            <>
              <Button variant="outline" onClick={() => { setOpen(false); setLastTicket(null); }}>
                Đóng
              </Button>
              <Button onClick={() => setLastTicket(null)} className="gap-2 bg-red-500 hover:bg-red-600 text-white">
                <Siren className="h-4 w-4" />
                Tạo điều động khác
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Huỷ
              </Button>
              <Button
                onClick={handleDispatch}
                disabled={!canSubmit}
                className="gap-2 bg-red-500 hover:bg-red-600 text-white"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Đang gửi..." : "Gửi điều động"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
