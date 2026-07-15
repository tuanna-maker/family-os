import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo, useState } from "react";

const SERIES = [
  { key: "residents", label: "Cư dân hoạt động", color: "oklch(0.55 0.2 264)" },
  { key: "requests", label: "Yêu cầu dịch vụ", color: "oklch(0.6 0.2 295)" },
  { key: "visitors", label: "Khách ra vào", color: "oklch(0.7 0.18 200)" },
  { key: "events", label: "Sự kiện ra vào", color: "oklch(0.72 0.17 152)" },
  { key: "incidents", label: "Sự cố", color: "oklch(0.63 0.24 25)" },
];

function buildData(days: number) {
  const data: Record<string, number | string>[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const t = (days - i) / days;
    data.push({
      day: label,
      residents: Math.round(5500 + Math.sin(i / 2) * 600 + t * 2200 + Math.random() * 200),
      requests: Math.round(3000 + Math.cos(i / 3) * 400 + t * 1100),
      visitors: Math.round(2200 + Math.sin(i / 1.5) * 300 + t * 600),
      events: Math.round(1400 + Math.cos(i) * 200 + t * 300),
      incidents: Math.round(200 + Math.random() * 60),
    });
  }
  return data;
}

const RANGES = [
  { label: "7 ngày qua", value: 7 },
  { label: "14 ngày qua", value: 14 },
  { label: "30 ngày qua", value: 30 },
];

export function GrowthChart() {
  const [range, setRange] = useState(7);
  const data = useMemo(() => buildData(range), [range]);

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-semibold">Biểu đồ tăng trưởng hoạt động</h3>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="h-8 px-2 rounded-lg border border-border bg-white text-[12px]"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] mb-2">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="text-foreground/80">{s.label}</span>
          </span>
        ))}
      </div>

      <div className="flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.012 255)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "oklch(0.5 0.02 260)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(0.5 0.02 260)" }} tickLine={false} axisLine={false}
              tickFormatter={(v) => v >= 1000 ? `${v / 1000}K` : v} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.93 0.012 255)", fontSize: 12 }} />
            <Legend wrapperStyle={{ display: "none" }} />
            {SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
