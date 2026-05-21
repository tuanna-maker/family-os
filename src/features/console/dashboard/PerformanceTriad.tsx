import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat { label: string; value: string; delta: number }
interface Card { title: string; stats: Stat[] }

const OPS: Card = {
  title: "Hiệu suất vận hành",
  stats: [
    { label: "Khách ra vào", value: "18.642", delta: 7.9 },
    { label: "QR scan", value: "32.156", delta: 9.2 },
    { label: "Sự kiện ra vào", value: "56.782", delta: 11.3 },
    { label: "Hoàn thành tuần tra", value: "92,5%", delta: 4.2 },
    { label: "SLA yêu cầu", value: "89,3%", delta: 3.1 },
    { label: "Hài lòng cư dân", value: "4,6/5", delta: 2.3 },
  ],
};

const INC = {
  title: "Tình hình sự cố",
  total: "342",
  totalDelta: -1.8,
  breakdown: [
    { label: "An ninh", count: 128, pct: 37, color: "oklch(0.55 0.2 264)" },
    { label: "Kỹ thuật", count: 86, pct: 25, color: "oklch(0.7 0.18 200)" },
    { label: "Dịch vụ", count: 74, pct: 22, color: "oklch(0.72 0.17 152)" },
    { label: "Khác", count: 54, pct: 16, color: "oklch(0.8 0.02 260)" },
  ],
  severity: [
    { label: "Nghiêm trọng", value: 18, color: "text-emergency" },
    { label: "Cao", value: 46, color: "text-warning" },
    { label: "Trung bình", value: 128, color: "text-info" },
    { label: "Thấp", value: 150, color: "text-muted-foreground" },
  ],
};

const FIN: Card = {
  title: "Tình hình tài chính",
  stats: [
    { label: "Doanh thu tháng", value: "2.450.000.000đ", delta: 8.6 },
    { label: "Công nợ phải thu", value: "680.000.000đ", delta: -4.2 },
  ],
};

function StatRow({ s }: { s: Stat }) {
  const positive = s.delta >= 0;
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
      <p className="text-[16px] font-bold tabular-nums mt-0.5">{s.value}</p>
      <div className="flex items-center gap-1 text-[10.5px] mt-0.5">
        {positive ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-emergency" />}
        <span className={cn("tabular-nums font-medium", positive ? "text-success" : "text-emergency")}>
          {positive ? "+" : ""}{s.delta.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function MiniBars() {
  // simple decorative bars for finance card
  const bars = Array.from({ length: 28 }, () => Math.random() * 0.8 + 0.2);
  return (
    <div className="flex items-end gap-[2px] h-10 mt-2">
      {bars.map((h, i) => (
        <span key={i} className="flex-1 rounded-sm bg-brand/30" style={{ height: `${h * 100}%` }} />
      ))}
    </div>
  );
}

export function PerformanceTriad() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold">{OPS.title}</h3>
        <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-4">
          {OPS.stats.map((s) => <StatRow key={s.label} s={s} />)}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold">{INC.title}</h3>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10.5px] text-muted-foreground">Tổng số sự cố</p>
            <p className="text-[24px] font-bold tabular-nums">{INC.total}</p>
            <div className="flex items-center justify-center gap-1 text-[10.5px]">
              <TrendingDown className="h-3 w-3 text-emergency" />
              <span className="text-emergency font-medium tabular-nums">{INC.totalDelta}%</span>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 text-[11.5px] min-w-0">
            {INC.breakdown.map((b) => (
              <li key={b.label} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                <span className="flex-1 truncate text-foreground/80">{b.label}</span>
                <span className="tabular-nums text-muted-foreground">{b.count} ({b.pct}%)</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-1 text-center">
          {INC.severity.map((s) => (
            <div key={s.label}>
              <p className={cn("text-[16px] font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold">{FIN.title}</h3>
        <div className="mt-3 grid grid-cols-1 gap-4">
          {FIN.stats.map((s) => (
            <div key={s.label}>
              <StatRow s={s} />
              <MiniBars />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
