import { useState } from "react";
import { ShieldCheck, Siren, ScanLine, MapPin, Radio, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { IncidentDetailDrawer, type Incident as IncidentT } from "./IncidentDetailDrawer";

// ---------- Tokens (dark command-center) ----------
const card = "rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white";
const subtle = "text-[11px] uppercase tracking-wider text-white/50";
const value = "text-[24px] font-bold tabular-nums mt-1";
const sectionTitle = "text-[13px] font-semibold text-white";

const TONE = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  crit: "text-red-400",
  info: "text-sky-400",
} as const;

// ---------- KPIs ----------
const KPIS = [
  { label: "Bảo vệ online", value: "32 / 38", sub: "84% lực lượng", icon: ShieldCheck, accent: TONE.ok },
  { label: "Sự cố đang mở", value: "4", sub: "1 P1 · 2 P2 · 1 P3", icon: Siren, accent: TONE.crit },
  { label: "Quét QR / giờ", value: "186", sub: "↑ 12% vs hôm qua", icon: ScanLine, accent: TONE.info },
  { label: "Checkpoint hoàn thành", value: "94%", sub: "118 / 125 điểm", icon: MapPin, accent: TONE.warn },
];

export function SecurityKpiStrip() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {KPIS.map((k) => (
        <div key={k.label} className={card}>
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center">
              <k.icon className={`h-4 w-4 ${k.accent}`} />
            </div>
            <span className={`text-[10px] ${k.accent}`}>● Live</span>
          </div>
          <p className={`${subtle} mt-3`}>{k.label}</p>
          <p className={value}>{k.value}</p>
          <p className="text-[11px] text-white/50 mt-1">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ---------- Guards on duty ----------
const GUARDS = [
  { id: "G-014", name: "Trần Văn Hùng", zone: "Cổng chính", status: "patrol", lastPing: "12s" },
  { id: "G-021", name: "Lê Minh Tuấn", zone: "Tầng hầm B2", status: "checkpoint", lastPing: "1m" },
  { id: "G-007", name: "Phạm Quốc Đạt", zone: "Tháp A · L05", status: "incident", lastPing: "8s" },
  { id: "G-033", name: "Nguyễn Thị Hoa", zone: "Lobby B", status: "idle", lastPing: "4m" },
  { id: "G-019", name: "Vũ Bá Khánh", zone: "Sảnh sự kiện", status: "patrol", lastPing: "22s" },
  { id: "G-028", name: "Đỗ Tuấn Anh", zone: "Bãi xe ngoài", status: "offline", lastPing: "18m" },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  patrol: { label: "Tuần tra", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  checkpoint: { label: "Checkpoint", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  incident: { label: "Đang xử lý", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  idle: { label: "Standby", cls: "bg-white/10 text-white/70 border-white/15" },
  offline: { label: "Offline", cls: "bg-zinc-700/40 text-zinc-400 border-zinc-600/40" },
};

export function GuardsOnlineCard() {
  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-400" />
          <h3 className={sectionTitle}>Lực lượng đang trực</h3>
        </div>
        <span className="text-[11px] text-white/50">{GUARDS.filter(g => g.status !== "offline").length} / {GUARDS.length} online</span>
      </div>
      <div className="space-y-2">
        {GUARDS.map((g) => {
          const s = STATUS_MAP[g.status];
          return (
            <div key={g.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-[11px] font-semibold text-white/80">
                {g.id.slice(-3)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{g.name}</p>
                <p className="text-[11px] text-white/50 truncate">{g.zone}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md border ${s.cls}`}>{s.label}</span>
              <span className="text-[10px] text-white/40 w-10 text-right tabular-nums">{g.lastPing}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Patrol Map (stylized) ----------
const ZONES = [
  { id: "A", name: "Tháp A", x: 18, y: 30, status: "ok", guards: 3 },
  { id: "B", name: "Tháp B", x: 50, y: 24, status: "warn", guards: 2 },
  { id: "C", name: "Tháp C", x: 78, y: 36, status: "ok", guards: 2 },
  { id: "L", name: "Lobby trung tâm", x: 50, y: 58, status: "ok", guards: 4 },
  { id: "P1", name: "Bãi xe B1", x: 24, y: 76, status: "crit", guards: 1 },
  { id: "P2", name: "Bãi xe B2", x: 72, y: 76, status: "ok", guards: 2 },
  { id: "G", name: "Cổng chính", x: 50, y: 88, status: "ok", guards: 3 },
];

const ZONE_COLOR: Record<string, string> = {
  ok: "fill-emerald-500/80 stroke-emerald-300",
  warn: "fill-amber-500/80 stroke-amber-300",
  crit: "fill-red-500/90 stroke-red-300 animate-pulse",
};

export function PatrolMapCard() {
  return (
    <div className={`${card} lg:col-span-2`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-sky-400" />
          <h3 className={sectionTitle}>Bản đồ tuần tra · Realtime</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />An toàn</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Cảnh báo</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" />Khẩn cấp</span>
        </div>
      </div>
      <div className="relative rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-white/5 overflow-hidden aspect-[16/9]">
        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Zones */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {/* paths between zones */}
          {[
            ["A", "L"], ["B", "L"], ["C", "L"], ["L", "G"], ["P1", "G"], ["P2", "G"],
          ].map(([a, b], i) => {
            const za = ZONES.find(z => z.id === a)!;
            const zb = ZONES.find(z => z.id === b)!;
            return (
              <line key={i} x1={za.x} y1={za.y} x2={zb.x} y2={zb.y}
                stroke="rgba(125,211,252,0.25)" strokeWidth="0.3" strokeDasharray="1 1" />
            );
          })}
          {ZONES.map((z) => (
            <g key={z.id}>
              <circle cx={z.x} cy={z.y} r="3.2" className={ZONE_COLOR[z.status]} strokeWidth="0.5" />
              <text x={z.x} y={z.y - 4.5} textAnchor="middle" className="fill-white/80" fontSize="2.4" fontWeight="600">
                {z.name}
              </text>
              <text x={z.x} y={z.y + 6.2} textAnchor="middle" className="fill-white/50" fontSize="2">
                {z.guards} guard
              </text>
            </g>
          ))}
        </svg>

        {/* Live label */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] text-white/70 bg-black/40 backdrop-blur px-2 py-1 rounded">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE FEED · 32 thiết bị
        </div>
      </div>
    </div>
  );
}

// ---------- QR Scan trend ----------
const QR_TREND = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, "0")}h`,
  resident: Math.round(20 + Math.sin(h / 3) * 12 + Math.random() * 8),
  visitor: Math.round(8 + Math.cos(h / 4) * 6 + Math.random() * 6),
}));

export function QrScanChart() {
  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-sky-400" />
          <h3 className={sectionTitle}>Quét QR ra vào · 24h</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/60">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Cư dân</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" />Khách</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={QR_TREND}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" fontSize={10} interval={2} />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
          <Tooltip
            contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="resident" stroke="#34d399" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="visitor" stroke="#38bdf8" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Incident queue ----------
type Incident = {
  id: string; priority: "P1" | "P2" | "P3";
  type: string; location: string; reportedAt: string;
  status: "new" | "assigned" | "in_progress" | "resolved";
  assignee?: string;
};

const INCIDENTS: Incident[] = [
  { id: "INC-2418", priority: "P1", type: "SOS · Cư dân", location: "Tháp A · Căn 1502", reportedAt: "2 phút", status: "in_progress", assignee: "G-007" },
  { id: "INC-2417", priority: "P2", type: "Người lạ xâm nhập", location: "Bãi xe B1 · Cột C4", reportedAt: "8 phút", status: "assigned", assignee: "G-021" },
  { id: "INC-2416", priority: "P2", type: "Báo cháy giả", location: "Tháp B · L12", reportedAt: "24 phút", status: "in_progress", assignee: "G-019" },
  { id: "INC-2415", priority: "P3", type: "Tranh chấp đỗ xe", location: "Sảnh ngoài · Cổng phụ", reportedAt: "1 giờ", status: "new" },
  { id: "INC-2414", priority: "P3", type: "Hỗ trợ kỹ thuật", location: "Tháp C · Căn 0301", reportedAt: "2 giờ", status: "resolved", assignee: "G-033" },
];

const PRIO: Record<Incident["priority"], string> = {
  P1: "bg-red-500/20 text-red-300 border-red-500/40",
  P2: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  P3: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};
const STATUS: Record<Incident["status"], { label: string; icon: typeof Clock; cls: string }> = {
  new: { label: "Chưa gán", icon: AlertTriangle, cls: "text-red-300" },
  assigned: { label: "Đã gán", icon: Clock, cls: "text-amber-300" },
  in_progress: { label: "Đang xử lý", icon: Radio, cls: "text-sky-300" },
  resolved: { label: "Hoàn thành", icon: CheckCircle2, cls: "text-emerald-300" },
};

export function IncidentQueueCard() {
  const [list, setList] = useState<Incident[]>(INCIDENTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const selected = list.find((i) => i.id === selectedId) ?? null;

  return (
    <div className={`${card} lg:col-span-2`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-red-400" />
          <h3 className={sectionTitle}>Hàng đợi sự cố</h3>
        </div>
        <button className="text-[11px] text-white/70 hover:text-white px-2.5 py-1 rounded-md border border-white/10 hover:border-white/30 transition">
          Xem tất cả
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="font-medium pb-2 pr-3">Mã</th>
              <th className="font-medium pb-2 pr-3">Mức</th>
              <th className="font-medium pb-2 pr-3">Loại</th>
              <th className="font-medium pb-2 pr-3">Vị trí</th>
              <th className="font-medium pb-2 pr-3">Trực</th>
              <th className="font-medium pb-2 pr-3">Thời gian</th>
              <th className="font-medium pb-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const S = STATUS[i.status];
              return (
                <tr
                  key={i.id}
                  onClick={() => { setSelectedId(i.id); setOpen(true); }}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.04] cursor-pointer"
                >
                  <td className="py-3 pr-3 font-mono text-white/70">{i.id}</td>
                  <td className="py-3 pr-3">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${PRIO[i.priority]}`}>{i.priority}</span>
                  </td>
                  <td className="py-3 pr-3 text-white/90">{i.type}</td>
                  <td className="py-3 pr-3 text-white/60">{i.location}</td>
                  <td className="py-3 pr-3 text-white/60 font-mono text-[11px]">{i.assignee ?? "—"}</td>
                  <td className="py-3 pr-3 text-white/50">{i.reportedAt}</td>
                  <td className="py-3">
                    <span className={`flex items-center gap-1.5 ${S.cls}`}>
                      <S.icon className="h-3.5 w-3.5" />
                      <span className="text-[11px]">{S.label}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <IncidentDetailDrawer
        incident={selected}
        open={open}
        onOpenChange={setOpen}
        onUpdate={(next) => setList((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
      />
    </div>
  );
}


// ---------- Access type donut ----------
const ACCESS = [
  { name: "Cư dân", value: 1860, color: "#34d399" },
  { name: "Khách mời", value: 420, color: "#38bdf8" },
  { name: "Giao hàng", value: 312, color: "#fbbf24" },
  { name: "Nhân viên", value: 184, color: "#a78bfa" },
];

export function AccessBreakdownCard() {
  const total = ACCESS.reduce((s, a) => s + a.value, 0);
  return (
    <div className={card}>
      <div className="flex items-center gap-2 mb-4">
        <ScanLine className="h-4 w-4 text-violet-400" />
        <h3 className={sectionTitle}>Cơ cấu ra vào hôm nay</h3>
      </div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={ACCESS} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2} strokeWidth={0}>
              {ACCESS.map((a) => <Cell key={a.name} fill={a.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[20px] font-bold tabular-nums">{total.toLocaleString("vi-VN")}</p>
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Lượt</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {ACCESS.map((a) => (
          <div key={a.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
            <span className="text-white/70 flex-1">{a.name}</span>
            <span className="text-white/90 font-semibold tabular-nums">{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Patrol completion bars ----------
const PATROL = [
  { shift: "Ca sáng", done: 42, total: 42 },
  { shift: "Ca chiều", done: 38, total: 42 },
  { shift: "Ca đêm", done: 38, total: 41 },
];
export function PatrolCompletionCard() {
  return (
    <div className={card}>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <h3 className={sectionTitle}>Hoàn thành checkpoint · Hôm nay</h3>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={PATROL} barCategoryGap={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="shift" stroke="rgba(255,255,255,0.5)" fontSize={11} />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
          <Tooltip
            contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
          />
          <Bar dataKey="total" fill="rgba(255,255,255,0.08)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="done" fill="#34d399" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
