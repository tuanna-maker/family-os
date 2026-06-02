import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listBqlBlocks } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Layers, Home } from "lucide-react";

export const Route = createFileRoute("/bql/toa-nha")({
  head: () => ({ meta: [{ title: "Toà nhà — BQL" }] }),
  component: BlocksScreen,
});

function BlocksScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const fn = useServerFn(listBqlBlocks);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-blocks", projectId || "all"],
    queryFn: () => fn({ data: { projectId: projectId || undefined } }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter(
      (r) => r.name.toLowerCase().includes(n) || r.code.toLowerCase().includes(n) || r.project_name.toLowerCase().includes(n),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const blocks = rows.length;
    const floors = rows.reduce((s, r) => s + r.floors_count, 0);
    const apartments = rows.reduce((s, r) => s + r.apartments_count, 0);
    const occupied = rows.reduce((s, r) => s + r.occupied_count, 0);
    return { blocks, floors, apartments, occupied };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Toà nhà</h1>
        <p className="text-sm text-muted-foreground">Cấu trúc block / tầng / căn hộ theo dự án.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Toà nhà" value={stats.blocks} />
        <StatCard icon={<Layers className="h-4 w-4" />} label="Tầng" value={stats.floors} />
        <StatCard icon={<Home className="h-4 w-4" />} label="Căn hộ" value={stats.apartments} />
        <StatCard icon={<Home className="h-4 w-4" />} label="Đã có cư dân" value={stats.occupied} />
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tìm theo tên / mã toà / dự án…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Mã</th>
                <th className="text-left p-3">Tên toà</th>
                <th className="text-left p-3">Dự án</th>
                <th className="text-right p-3">Tầng</th>
                <th className="text-right p-3">Căn hộ</th>
                <th className="text-right p-3">Lấp đầy</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chưa có toà nhà.</td></tr>
              )}
              {filtered.map((r) => {
                const rate = r.apartments_count ? Math.round((r.occupied_count / r.apartments_count) * 100) : 0;
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.code}</td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.project_name}</td>
                    <td className="p-3 text-right tabular-nums">
                      {r.floors_count}
                      {r.total_floors != null && <span className="text-muted-foreground">/{r.total_floors}</span>}
                    </td>
                    <td className="p-3 text-right tabular-nums">{r.apartments_count}</td>
                    <td className="p-3 text-right">
                      <Badge variant={rate >= 80 ? "default" : rate >= 50 ? "secondary" : "outline"}>{rate}%</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}
