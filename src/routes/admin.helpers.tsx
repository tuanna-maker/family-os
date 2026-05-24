import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminFilterBar, StatusBadge } from "@/components/admin/AdminFilterBar";
import { helpers, helperTasks, helperActivity, defaultPermissions, payments } from "@/features/family-core/helper-management/data";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/helpers")({
  head: () => ({ meta: [{ title: "Giúp việc — Admin" }] }),
  component: AdminHelpers,
});

function AdminHelpers() {
  const [search, setSearch] = useState("");
  const [familyId, setFamilyId] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () =>
      helpers.filter((h) => {
        if (status !== "all" && h.status !== status) return false;
        if (search && !`${h.name} ${h.role}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [search, status]
  );

  const doneTasks = helperTasks.filter((t) => t.done).length;

  return (
    <AdminGate>
      <AdminShell eyebrow="Family Core" title="Quản lý giúp việc">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Giúp việc đang làm" value={helpers.filter((h) => h.status === "active").length} />
          <Kpi label="Đã xác minh" value={helpers.filter((h) => h.verified).length} />
          <Kpi label="Công việc hôm nay" value={`${doneTasks}/${helperTasks.length}`} />
          <Kpi label="Lương chờ chi" value={payments.filter((p) => p.status === "pending").length} />
        </div>

        <AdminFilterBar
          search={search}
          onSearch={setSearch}
          familyId={familyId}
          onFamily={setFamilyId}
          placeholder="Tìm tên giúp việc…"
          right={
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-xl bg-card border border-border text-sm">
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đang làm</option>
              <option value="leave">Nghỉ phép</option>
            </select>
          }
        />

        <div className="rounded-3xl bg-card border border-border overflow-hidden mb-6">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold">Danh sách giúp việc</h2>
            <p className="text-xs text-muted-foreground mt-1">Ẩn CCCD đầy đủ, chỉ hiển thị mã rút gọn</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Giúp việc</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Bắt đầu</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Xác minh</th>
                <th className="text-right p-4 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-tint-orange grid place-items-center text-lg shrink-0">{h.avatar}</div>
                      <div>
                        <p className="font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{h.startDate}</td>
                  <td className="p-4 hidden md:table-cell">
                    <StatusBadge tone={h.verified ? "ok" : "warn"}>{h.verified ? "Đã xác minh" : "Chờ"}</StatusBadge>
                  </td>
                  <td className="p-4 text-right">
                    <StatusBadge tone={h.status === "active" ? "ok" : "muted"}>{h.status === "active" ? "Đang làm" : "Nghỉ"}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-card border border-border p-5">
            <h2 className="text-base font-semibold mb-3">Tổng quan quyền truy cập</h2>
            <ul className="space-y-2 text-sm">
              {defaultPermissions.map((p) => {
                const allow = p.kind === "allow";
                const granted = allow ? p.enabled : !p.enabled;
                return (
                  <li key={p.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className={`h-7 w-7 rounded-lg grid place-items-center shrink-0 ${granted ? "bg-tint-green text-success" : "bg-tint-red text-emergency"}`}>
                      {granted ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    <StatusBadge tone={allow ? "info" : "alert"}>{allow ? "Cho phép" : "Từ chối"}</StatusBadge>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-3xl bg-card border border-border p-5">
            <h2 className="text-base font-semibold mb-3">Nhật ký hoạt động</h2>
            <ul className="space-y-2 text-sm">
              {helperActivity.map((a) => (
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

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
