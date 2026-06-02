import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminFilterBar, StatusBadge } from "@/components/admin/AdminFilterBar";
import { elderlyProfiles, activityLog, medicationReminders } from "@/features/family-core/elderly-care/data";

export const Route = createFileRoute("/admin/elderly-care")({
  head: () => ({ meta: [{ title: "Chăm sóc ông bà — Admin" }] }),
  component: AdminElderly,
});

const STATUS_LABEL: Record<string, string> = { ok: "An toàn", warn: "Theo dõi", alert: "Cần chú ý" };

function AdminElderly() {
  const [search, setSearch] = useState("");
  const [familyId, setFamilyId] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () =>
      elderlyProfiles.filter((p) => {
        if (status !== "all" && p.safeCheck.status !== status) return false;
        if (search && !`${p.name} ${p.relation}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [search, status]
  );

  const okCount = elderlyProfiles.filter((p) => p.safeCheck.status === "ok").length;
  const warnCount = elderlyProfiles.filter((p) => p.safeCheck.status === "warn").length;
  const alertCount = elderlyProfiles.filter((p) => p.safeCheck.status === "alert").length;

  return (
    <AdminGate>
      <AdminShell eyebrow="Family Core" title="Chăm sóc ông bà">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Tổng hồ sơ" value={elderlyProfiles.length} tone="info" />
          <Kpi label="An toàn" value={okCount} tone="ok" />
          <Kpi label="Theo dõi" value={warnCount} tone="warn" />
          <Kpi label="Cần chú ý" value={alertCount} tone="alert" />
        </div>

        <AdminFilterBar
          search={search}
          onSearch={setSearch}
          familyId={familyId}
          onFamily={setFamilyId}
          placeholder="Tìm tên, quan hệ…"
          right={
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-xl bg-card border border-border text-sm">
              <option value="all">Mọi trạng thái</option>
              <option value="ok">An toàn</option>
              <option value="warn">Theo dõi</option>
              <option value="alert">Cần chú ý</option>
            </select>
          }
        />

        <div className="rounded-3xl bg-card border border-border overflow-hidden mb-6">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold">Tổng quan an toàn người cao tuổi</h2>
            <p className="text-xs text-muted-foreground mt-1">Không hiển thị chẩn đoán chi tiết cho bên thứ ba</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Người</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Tuổi</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Safe check cuối</th>
                <th className="text-right p-4 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-tint-blue grid place-items-center text-lg shrink-0">{p.avatar}</div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.relation}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{p.age}</td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{p.safeCheck.lastSeen}</td>
                  <td className="p-4 text-right">
                    <StatusBadge tone={p.safeCheck.status as "ok" | "warn" | "alert"}>
                      {STATUS_LABEL[p.safeCheck.status]}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-card border border-border p-5">
            <h2 className="text-base font-semibold mb-3">Nhắc uống thuốc hôm nay</h2>
            <ul className="space-y-2 text-sm">
              {medicationReminders.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-lg">💊</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.medicine}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.dosage} · {m.time}</p>
                  </div>
                  <StatusBadge tone={m.taken ? "ok" : "warn"}>{m.taken ? "Đã uống" : "Chờ"}</StatusBadge>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-card border border-border p-5">
            <h2 className="text-base font-semibold mb-3">Nhật ký hoạt động</h2>
            <ul className="space-y-2 text-sm">
              {activityLog.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <span className="h-2 w-2 mt-2 rounded-full bg-brand shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{a.at}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AdminShell>
    </AdminGate>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "alert" | "info" }) {
  const ring: Record<string, string> = {
    ok: "bg-tint-green",
    warn: "bg-tint-orange",
    alert: "bg-tint-red",
    info: "bg-tint-blue",
  };
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <div className={`h-2 w-10 rounded-full ${ring[tone]} mb-3`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
