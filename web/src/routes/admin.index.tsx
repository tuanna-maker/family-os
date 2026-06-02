import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { requireAuth } from "@/lib/require-auth";
import {
  overviewKpis,
  userGrowthSeries,
  recentRequests,
  moduleOverview,
} from "@/features/admin";

export const Route = createFileRoute("/admin/")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Admin — STOS Life" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  return (
    <AdminGate>
    <AdminShell
      eyebrow="Bảng điều khiển"
      title="Tổng quan vận hành"
      actions={
        <>
          <select className="h-10 px-3 rounded-xl bg-card border border-border text-sm hidden sm:block">
            <option>30 ngày qua</option>
            <option>7 ngày qua</option>
          </select>
          <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Xuất báo cáo
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewKpis.map((k) => (
          <div key={k.label} className="rounded-3xl bg-card border border-border p-5">
            <div className={`h-10 w-10 rounded-2xl ${k.bg} grid place-items-center mb-3`}>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold mt-1">{k.value}</p>
            {k.delta && (
              <p className={`text-xs font-medium mt-1 ${k.color}`}>{k.delta} so với kỳ trước</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Tăng trưởng người dùng</h2>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-tint-blue text-brand font-medium">DAU</span>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">MAU</span>
            </div>
          </div>
          <div className="h-64 flex items-end gap-2">
            {userGrowthSeries.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-brand to-pink/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-6">
          <h2 className="text-base font-semibold mb-4">Yêu cầu mới nhất</h2>
          <ul className="space-y-3 text-sm">
            {recentRequests.map((r, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full bg-${r.tone}`} />
                <span className="font-medium">{r.type}</span>
                <span className="text-muted-foreground text-xs truncate">{r.who}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">{r.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {moduleOverview.map((m) => (
          <div key={m.title} className={`rounded-3xl ${m.tint} p-6 border border-border`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {m.title}
            </p>
            <p className="text-xl font-bold mt-2">{m.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
          </div>
        ))}
      </div>
    </AdminShell>
    </AdminGate>
  );
}
