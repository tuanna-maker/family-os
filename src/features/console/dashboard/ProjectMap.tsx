import { MapPin, ChevronDown } from "lucide-react";

const PINS = [
  { x: 32, y: 16, color: "oklch(0.55 0.2 264)" },   // north
  { x: 38, y: 30, color: "oklch(0.7 0.18 200)" },
  { x: 50, y: 48, color: "oklch(0.6 0.2 295)" },    // central
  { x: 58, y: 60, color: "oklch(0.72 0.17 152)" },
  { x: 70, y: 78, color: "oklch(0.73 0.17 50)" },   // south
  { x: 64, y: 70, color: "oklch(0.55 0.2 264)" },
];

const ITEMS = [
  { name: "Vinhomes", count: "28 dự án", color: "text-brand", dot: "bg-brand" },
  { name: "Sunshine Group", count: "16 dự án", color: "text-success", dot: "bg-success" },
  { name: "Masterise Homes", count: "14 dự án", color: "text-[oklch(0.55_0.18_295)]", dot: "bg-[oklch(0.55_0.18_295)]" },
  { name: "Nam Long", count: "12 dự án", color: "text-warning", dot: "bg-warning" },
  { name: "Khác", count: "146 dự án", color: "text-muted-foreground", dot: "bg-muted-foreground" },
];

export function ProjectMap() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold">Bản đồ dự án</h3>
        <button className="h-8 px-2 inline-flex items-center gap-1 rounded-lg border border-border bg-white text-[11.5px] text-muted-foreground">
          Xem theo: Tenant <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_140px] gap-3">
        <div className="relative rounded-xl bg-[oklch(0.97_0.01_250)] border border-border overflow-hidden min-h-[260px]">
          {/* Stylised VN outline */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <path
              d="M30 8 L36 14 L40 22 L36 28 L40 34 L48 40 L52 48 L60 54 L62 62 L70 70 L74 80 L66 88 L60 86 L56 78 L50 72 L46 64 L40 56 L36 46 L32 38 L28 28 L26 18 Z"
              fill="oklch(0.92 0.02 250)"
              stroke="oklch(0.85 0.02 250)"
              strokeWidth="0.4"
            />
          </svg>
          {PINS.map((p, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <MapPin className="h-5 w-5 drop-shadow" style={{ color: p.color, fill: p.color }} />
            </div>
          ))}
        </div>
        <ul className="space-y-2 text-[12px]">
          {ITEMS.map((it) => (
            <li key={it.name} className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 rounded-full ${it.dot}`} />
              <div className="min-w-0">
                <p className="font-semibold truncate">{it.name}</p>
                <p className="text-[10.5px] text-muted-foreground">{it.count}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <a href="#" className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand font-semibold self-end">
        Xem toàn bộ bản đồ →
      </a>
    </div>
  );
}
