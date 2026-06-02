import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listBqlFamilies } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users2, Home } from "lucide-react";

export const Route = createFileRoute("/bql/ho-gia-dinh")({
  head: () => ({ meta: [{ title: "Hộ gia đình — BQL" }] }),
  component: HouseholdsScreen,
});

function HouseholdsScreen() {
  const { projectId } = useBqlProject();
  const [q, setQ] = useState("");
  const fn = useServerFn(listBqlFamilies);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-families", projectId || "all"],
    queryFn: () => fn({ data: { projectId: projectId || undefined } }),
  });
  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(n) ||
        (r.primary_apartment_code ?? "").toLowerCase().includes(n) ||
        r.apartments.some((a) => a.code.toLowerCase().includes(n)),
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const families = rows.length;
    const apartments = rows.reduce((s, r) => s + r.apartments_count, 0);
    const members = rows.reduce((s, r) => s + r.members_count, 0);
    const multi = rows.filter((r) => r.apartments_count > 1).length;
    return { families, apartments, members, multi };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hộ gia đình</h1>
        <p className="text-sm text-muted-foreground">Các hộ cư trú trong dự án, tổng hợp từ căn hộ &amp; thành viên.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Số hộ" value={stats.families} />
        <StatCard label="Căn hộ liên kết" value={stats.apartments} />
        <StatCard label="Thành viên" value={stats.members} />
        <StatCard label="Hộ nhiều căn" value={stats.multi} />
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên hộ hoặc mã căn…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Hộ gia đình</th>
                <th className="text-left p-3">Căn chính</th>
                <th className="text-left p-3">Dự án</th>
                <th className="text-right p-3">Căn</th>
                <th className="text-right p-3">Thành viên</th>
                <th className="text-left p-3">Căn khác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chưa có hộ gia đình.</td></tr>
              )}
              {filtered.map((r) => {
                const others = r.apartments.filter((a) => a.code !== r.primary_apartment_code);
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 align-top">
                    <td className="p-3 font-medium flex items-center gap-1.5">
                      <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {r.name}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {r.primary_apartment_code ? (
                        <span className="inline-flex items-center gap-1">
                          <Home className="h-3 w-3 text-muted-foreground" />
                          {r.primary_apartment_code}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{r.primary_project_name ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{r.apartments_count}</td>
                    <td className="p-3 text-right tabular-nums">{r.members_count}</td>
                    <td className="p-3">
                      {others.length === 0 ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {others.map((a) => (
                            <Badge key={a.apartment_id} variant="outline" className="font-mono text-[10px]">
                              {a.code}
                            </Badge>
                          ))}
                        </div>
                      )}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}
