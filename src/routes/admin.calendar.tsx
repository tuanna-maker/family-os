import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminFilterBar, StatusBadge } from "@/components/admin/AdminFilterBar";
import { calendarEvents, calendarCategoryLabel } from "@/features/family-core/calendar/data";

export const Route = createFileRoute("/admin/calendar")({
  head: () => ({ meta: [{ title: "Lịch gia đình — Admin" }] }),
  component: AdminCalendar,
});

function AdminCalendar() {
  const [search, setSearch] = useState("");
  const [familyId, setFamilyId] = useState("all");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    return calendarEvents.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (search && !`${e.title} ${e.member}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, category]);

  return (
    <AdminGate>
      <AdminShell eyebrow="Family Core" title="Lịch gia đình">
        <AdminFilterBar
          search={search}
          onSearch={setSearch}
          familyId={familyId}
          onFamily={setFamilyId}
          placeholder="Tìm sự kiện, thành viên…"
          right={
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 px-3 rounded-xl bg-card border border-border text-sm"
            >
              <option value="all">Tất cả loại</option>
              {Object.entries(calendarCategoryLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Tổng sự kiện" value={calendarEvents.length} />
          <Kpi label="Tuần này" value={calendarEvents.filter((e) => e.date >= "2026-05-18" && e.date <= "2026-05-24").length} />
          <Kpi label="Sức khỏe" value={calendarEvents.filter((e) => e.category === "health").length} />
          <Kpi label="Học tập" value={calendarEvents.filter((e) => e.category === "school").length} />
        </div>

        <div className="rounded-3xl bg-card border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold">Danh sách sự kiện</h2>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} / {calendarEvents.length} bản ghi</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Sự kiện</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Ngày</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Thành viên</th>
                <th className="text-right p-4 font-medium">Loại</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{e.icon}</span>
                      <span className="font-medium">{e.title}</span>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{e.date} {e.time ?? ""}</td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{e.member}</td>
                  <td className="p-4 text-right">
                    <StatusBadge tone={e.category === "health" ? "alert" : e.category === "school" ? "info" : "ok"}>
                      {calendarCategoryLabel[e.category]}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">Không có sự kiện phù hợp</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminShell>
    </AdminGate>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
