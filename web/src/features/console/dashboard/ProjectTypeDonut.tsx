import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const DATA = [
  { label: "Chung cư", value: 132, color: "oklch(0.55 0.2 264)" },
  { label: "Khu đô thị", value: 48, color: "oklch(0.7 0.18 200)" },
  { label: "Tổ hợp căn hộ", value: 20, color: "oklch(0.6 0.2 295)" },
  { label: "Khu nghỉ dưỡng", value: 10, color: "oklch(0.72 0.17 152)" },
  { label: "Khác", value: 6, color: "oklch(0.8 0.02 260)" },
];

export function ProjectTypeDonut() {
  const total = DATA.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft h-full flex flex-col">
      <h3 className="text-[14px] font-semibold">Phân bố dự án theo loại hình</h3>
      <div className="mt-3 flex-1 flex items-center gap-4">
        <div className="relative h-[200px] w-[200px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={DATA} dataKey="value" innerRadius={64} outerRadius={92} stroke="white" strokeWidth={2}>
                {DATA.map((d) => <Cell key={d.label} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground">Tổng</p>
              <p className="text-[24px] font-bold tabular-nums leading-none">{total}</p>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">dự án</p>
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-2 min-w-0">
          {DATA.map((d) => {
            const pct = ((d.value / total) * 100).toFixed(1);
            return (
              <li key={d.label} className="flex items-center gap-2 text-[12px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 truncate text-foreground/80">{d.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {d.value} ({pct}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
