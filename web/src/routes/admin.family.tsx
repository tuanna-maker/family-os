import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { family } from "@/features/family-core";
import { familyModules } from "@/features/admin";

export const Route = createFileRoute("/admin/family")({
  head: () => ({ meta: [{ title: "Family Core — Admin" }] }),
  component: AdminFamily,
});

function AdminFamily() {
  return (
    <div className="dark bg-background text-foreground min-h-screen">
    <AdminGate>
    <AdminShell
      eyebrow="Family Core"
      title="Quản trị gia đình"
      actions={
        <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Mời gia đình
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {familyModules.map((m) => (
          <div key={m.label} className="rounded-3xl bg-card border border-border p-5">
            <div className={`h-10 w-10 rounded-2xl ${m.tint} grid place-items-center mb-3`}>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-2xl font-bold mt-1">{m.users}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tỉ lệ dùng: <span className={m.color}>{m.active}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Thành viên gia đình mẫu</h2>
          </div>
          <span className="text-xs text-muted-foreground">{family.members.length} người</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-4 font-medium">Thành viên</th>
              <th className="text-left p-4 font-medium hidden sm:table-cell">Vai trò</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Tuổi</th>
              <th className="text-right p-4 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {family.members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-tint-blue grid place-items-center text-lg shrink-0">
                      {m.avatar}
                    </div>
                    <span className="font-medium truncate">{m.name}</span>
                  </div>
                </td>
                <td className="p-4 hidden sm:table-cell text-muted-foreground">{m.role}</td>
                <td className="p-4 hidden md:table-cell text-muted-foreground">{m.age}</td>
                <td className="p-4 text-right">
                  <span className="px-2 py-1 rounded-full bg-tint-green text-success text-xs font-medium">
                    Hoạt động
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
    </AdminGate>
    </div>
  );
}
