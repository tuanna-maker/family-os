import { createFileRoute } from "@tanstack/react-router";
import { ROLE_LIST } from "@/constants/permissions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions" }] }),
  component: RolesScreen,
});

function RolesScreen() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ma trận vai trò — quyền. Cấu hình tập trung tại <code className="text-[11px]">src/constants/permissions.ts</code>.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {ROLE_LIST.map((r) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold">{r.name}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">{r.description}</p>
              </div>
              <Badge variant="outline" className="capitalize text-[10px]">{r.scope}</Badge>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Quyền ({r.permissions.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {r.permissions.map((p) => (
                  <span key={p} className="text-[10px] font-mono rounded bg-muted px-1.5 py-0.5">{p}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
