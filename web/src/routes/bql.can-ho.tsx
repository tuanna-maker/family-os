import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listBqlApartments } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Home } from "lucide-react";

export const Route = createFileRoute("/bql/can-ho")({
  head: () => ({ meta: [{ title: "Căn hộ — BQL" }] }),
  component: ApartmentsScreen,
});

const STATUS_LABEL: Record<string, string> = {
  available: "Trống",
  occupied: "Đang ở",
  maintenance: "Bảo trì",
  reserved: "Đặt giữ",
};

function ApartmentsScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const fn = useServerFn(listBqlApartments);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-apartments", projectId || "all", status || "all"],
    queryFn: () =>
      fn({
        data: {
          projectId: projectId || undefined,
          status: (status || undefined) as any,
        },
      }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(n) ||
        (r.block_name ?? "").toLowerCase().includes(n) ||
        r.project_name.toLowerCase().includes(n),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const total = rows.length;
    const occ = rows.filter((r) => r.status === "occupied").length;
    const avail = rows.filter((r) => r.status === "available").length;
    const maint = rows.filter((r) => r.status === "maintenance").length;
    return { total, occ, avail, maint };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Căn hộ</h1>
        <p className="text-sm text-muted-foreground">Toàn bộ căn hộ theo dự án.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tổng" value={stats.total} />
        <StatCard label="Đang ở" value={stats.occ} />
        <StatCard label="Trống" value={stats.avail} />
        <StatCard label="Bảo trì" value={stats.maint} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã căn / block / dự án…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="available">Trống</option>
          <option value="occupied">Đang ở</option>
          <option value="maintenance">Bảo trì</option>
          <option value="reserved">Đặt giữ</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Mã căn</th>
                <th className="text-left p-3">Toà · Tầng</th>
                <th className="text-left p-3">Dự án</th>
                <th className="text-right p-3">DT (m²)</th>
                <th className="text-right p-3">PN/WC</th>
                <th className="text-right p-3">Cư dân</th>
                <th className="text-left p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có căn hộ.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                    {r.code}
                  </td>
                  <td className="p-3">
                    {r.block_name ?? "—"}
                    {r.floor_number != null && <span className="text-muted-foreground"> · T{r.floor_number}</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.project_name}</td>
                  <td className="p-3 text-right tabular-nums">{r.area_m2 ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">
                    {r.bedrooms ?? "—"}/{r.bathrooms ?? "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">{r.residents}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        r.status === "occupied"
                          ? "default"
                          : r.status === "available"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}
