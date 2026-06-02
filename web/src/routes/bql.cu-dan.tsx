import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listBqlResidents } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Users, Home, Star } from "lucide-react";

export const Route = createFileRoute("/bql/cu-dan")({
  head: () => ({ meta: [{ title: "Cư dân — BQL" }] }),
  component: ResidentsScreen,
});

function ResidentsScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const fn = useServerFn(listBqlResidents);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-residents", projectId || "all", activeOnly],
    queryFn: () => fn({ data: { projectId: projectId || undefined, activeOnly } }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.family_name.toLowerCase().includes(n) ||
        r.apartment_code.toLowerCase().includes(n) ||
        (r.block_name ?? "").toLowerCase().includes(n),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const families = new Set(rows.map((r) => r.family_id)).size;
    const apartments = new Set(rows.map((r) => r.apartment_id)).size;
    const primary = rows.filter((r) => r.is_primary).length;
    return { residents: rows.length, families, apartments, primary };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cư dân</h1>
        <p className="text-sm text-muted-foreground">Danh sách hộ gia đình đang cư trú theo dự án.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Cư dân" value={stats.residents} />
        <StatCard icon={<Home className="h-4 w-4" />} label="Hộ gia đình" value={stats.families} />
        <StatCard icon={<Home className="h-4 w-4" />} label="Căn hộ" value={stats.apartments} />
        <StatCard icon={<Star className="h-4 w-4" />} label="Chủ hộ" value={stats.primary} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hộ / mã căn / block…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Đang ở
        </label>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Hộ gia đình</th>
                <th className="text-left p-3">Căn hộ</th>
                <th className="text-left p-3">Dự án</th>
                <th className="text-left p-3">Quan hệ</th>
                <th className="text-left p-3">Ngày vào</th>
                <th className="text-left p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chưa có cư dân.</td></tr>
              )}
              {filtered.map((r, i) => (
                <tr key={`${r.family_id}-${r.apartment_id}-${i}`} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {r.family_name}
                    {r.is_primary && <Badge variant="secondary" className="ml-2 text-[10px]">Chủ hộ</Badge>}
                  </td>
                  <td className="p-3 tabular-nums">
                    {r.apartment_code}
                    {r.block_name && <span className="text-muted-foreground"> · {r.block_name}</span>}
                    {r.floor_number != null && <span className="text-muted-foreground"> · T{r.floor_number}</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.project_name}</td>
                  <td className="p-3 capitalize">{r.relation}</td>
                  <td className="p-3 tabular-nums text-xs">{new Date(r.move_in_date).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3">
                    {r.move_out_date ? (
                      <Badge variant="outline">Đã chuyển</Badge>
                    ) : (
                      <Badge>Đang ở</Badge>
                    )}
                  </td>
                </tr>
              ))}
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
