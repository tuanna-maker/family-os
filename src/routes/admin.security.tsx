import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Siren } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { securityKpis, adminIncidents } from "@/features/admin";

export const Route = createFileRoute("/admin/security")({
  head: () => ({ meta: [{ title: "Security Core — Admin" }] }),
  component: AdminSecurity,
});

function AdminSecurity() {
  return (
    <AdminGate>
    <AdminShell
      eyebrow="Security Core"
      title="Trung tâm vận hành 24/7"
      actions={
        <button className="h-10 px-4 rounded-xl bg-emergency text-white text-sm font-semibold flex items-center gap-2">
          <Siren className="h-4 w-4" /> Phát SOS
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {securityKpis.map((k) => (
          <div key={k.label} className="rounded-3xl bg-card border border-border p-5">
            <div className={`h-10 w-10 rounded-2xl ${k.tint} grid place-items-center mb-3`}>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Sự cố gần đây</h2>
          </div>
          <span className="text-xs text-muted-foreground">{adminIncidents.length} sự kiện</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-4 font-medium">Mã</th>
              <th className="text-left p-4 font-medium">Loại</th>
              <th className="text-left p-4 font-medium hidden sm:table-cell">Vị trí</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Thời gian</th>
              <th className="text-right p-4 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {adminIncidents.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-4 font-mono text-xs">{i.id}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <span className={`h-2 w-2 rounded-full ${i.tone}`} />
                    {i.type}
                  </div>
                </td>
                <td className="p-4 hidden sm:table-cell text-muted-foreground">{i.who}</td>
                <td className="p-4 hidden md:table-cell text-muted-foreground">{i.at}</td>
                <td className="p-4 text-right text-xs text-muted-foreground">{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
    </AdminGate>
  );
}
