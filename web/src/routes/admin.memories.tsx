import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminFilterBar, StatusBadge } from "@/components/admin/AdminFilterBar";
import { albums, milestones, timeline, albumCategories, type AlbumCategory } from "@/features/family-core/memories/data";

export const Route = createFileRoute("/admin/memories")({
  head: () => ({ meta: [{ title: "Kỷ niệm — Admin" }] }),
  component: AdminMemories,
});

function AdminMemories() {
  const [search, setSearch] = useState("");
  const [familyId, setFamilyId] = useState("all");
  const [cat, setCat] = useState<string>("all");

  const filtered = useMemo(
    () =>
      albums.filter((a) => {
        if (cat !== "all" && a.category !== (cat as AlbumCategory)) return false;
        if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [search, cat]
  );

  const totalPhotos = albums.reduce((s, a) => s + a.count, 0);

  return (
    <AdminGate>
      <AdminShell eyebrow="Family Core" title="Kỷ niệm gia đình">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Tổng album" value={albums.length} />
          <Kpi label="Tổng ảnh" value={totalPhotos} />
          <Kpi label="Dấu mốc" value={milestones.length} />
          <Kpi label="Mục timeline" value={timeline.length} />
        </div>

        <AdminFilterBar
          search={search}
          onSearch={setSearch}
          familyId={familyId}
          onFamily={setFamilyId}
          placeholder="Tìm album…"
          right={
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 px-3 rounded-xl bg-card border border-border text-sm">
              <option value="all">Tất cả danh mục</option>
              {albumCategories.map((c) => (
                <option key={c.key} value={c.key}>{c.emoji} {c.key}</option>
              ))}
            </select>
          }
        />

        <div className="rounded-3xl bg-card border border-border overflow-hidden mb-6">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold">Album</h2>
            <p className="text-xs text-muted-foreground mt-1">Mặc định riêng tư — không hiển thị nội dung ảnh cho admin</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Album</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Số ảnh</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Tháng</th>
                <th className="text-right p-4 font-medium">Danh mục</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{a.cover}</span>
                      <span className="font-medium">{a.title}</span>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{a.count}</td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{a.date}</td>
                  <td className="p-4 text-right">
                    <StatusBadge tone="info">{a.category}</StatusBadge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">Không có album phù hợp</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl bg-card border border-border p-5">
          <h2 className="text-base font-semibold mb-3">Dòng thời gian gần đây</h2>
          <ul className="space-y-2 text-sm">
            {timeline.map((t) => (
              <li key={t.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xl shrink-0">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                  {t.photoCount ? <p className="text-[10px] text-brand font-semibold">{t.photoCount} ảnh</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </AdminShell>
    </AdminGate>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
