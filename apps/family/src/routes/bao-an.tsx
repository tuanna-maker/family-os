import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SecurityShell, buildingStatus, securityMeta, securityServiceGrid, securityServiceCatalog, SecurityRequestsTracker } from "@/features/security-core";
import { createSecurityRequest } from "@/api/security";
import { useAuth } from "@shared/ui/hooks/use-auth";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/bao-an")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Dịch vụ bảo an — STOS Life" }] }),
  component: SecurityPage,
});

// Map service grid id → request_type enum
const TYPE_MAP: Record<string, "sos" | "fire" | "intrusion" | "noise" | "package" | "other"> = {
  sos: "sos",
  fire: "fire",
  stranger: "intrusion",
  package: "package",
  tech: "other",
  call: "other",
  chat: "other",
};

function SecurityPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
    const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  async function trigger(type: "sos" | "fire" | "intrusion" | "noise" | "package" | "other", label: string) {
    if (!session) {
      toast.error("Bạn cần đăng nhập để gọi bảo an");
      navigate({ to: "/login", search: { redirect: "/bao-an" } });
      return;
    }
    setPending(type);
    try {
      await createSecurityRequest({ request_type: type });
      await qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(`Đã gửi yêu cầu: ${label}`, {
        description: `Bảo an phản hồi trong ~${securityMeta.responseTimeMinutes} phút. Xem trạng thái bên dưới.`,
      });
    } catch (e) {
      toast.error("Không gửi được yêu cầu", { description: (e as Error).message });
    } finally {
      setPending(null);
    }
  }

  return (
    <SecurityShell
      title="Có việc gì, cứ gọi em"
      subtitle={`Đội bảo an phản hồi trung bình trong ${securityMeta.responseTimeMinutes} phút`}
    >
      <section className="px-4 mt-4">
        <button
          onClick={() => trigger("sos", "SOS khẩn cấp")}
          disabled={pending === "sos"}
          className="w-full rounded-3xl p-6 bg-gradient-to-br from-emergency to-pink text-white shadow-[var(--shadow-pop)] active:scale-[0.98] transition disabled:opacity-70"
        >
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 grid place-items-center text-4xl ring-2 ring-white/30 shrink-0">
              🆘
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xl font-bold">
                {pending === "sos" ? "Đang gửi…" : "Gọi SOS khẩn cấp"}
              </p>
              <p className="text-sm text-white/80 mt-0.5">Nhấn để kích hoạt ngay</p>
            </div>
          </div>
        </button>
      </section>

      <SecurityRequestsTracker />

      <section className="px-4 mt-4 grid grid-cols-2 gap-3">
        {securityServiceGrid.map(({ id, icon: Icon, label, desc, color, bg }) => {
          const type = TYPE_MAP[id] ?? "other";
          return (
            <button
              key={id}
              onClick={() => trigger(type, label)}
              disabled={pending === type}
              className="rounded-3xl bg-card border border-border p-4 text-left active:scale-[0.98] transition disabled:opacity-70"
            >
              <div className={`h-11 w-11 rounded-2xl grid place-items-center ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="mt-3 text-sm font-semibold">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </button>
          );
        })}
      </section>

      <section className="px-4 mt-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Dịch vụ Bảo An</h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {securityServiceCatalog.length} nhóm
          </span>
        </div>

        {securityServiceCatalog.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div
              key={group.id}
              className="rounded-3xl bg-card border border-border overflow-hidden"
            >
              <div className="flex items-start gap-3 p-4">
                <div className={`h-10 w-10 rounded-2xl grid place-items-center shrink-0 ${group.tint}`}>
                  <GroupIcon className={`h-5 w-5 ${group.accent}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{group.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{group.subtitle}</p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {group.items.map((it) => {
                  const ItIcon = it.icon;
                  return (
                    <li key={it.id}>
                      <button
                        onClick={() =>
                          trigger("other", `${group.title} · ${it.label}`)
                        }
                        disabled={pending === "other"}
                        className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/40 transition disabled:opacity-70"
                      >
                        <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${group.tint}`}>
                          <ItIcon className={`h-4 w-4 ${group.accent}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate">{it.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{it.desc}</p>
                        </div>
                        <span className="text-muted-foreground text-lg leading-none">›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>



      <section className="px-4 mt-6">
        <div className="rounded-3xl bg-card border border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Trạng thái tòa nhà
          </p>
          <div className="mt-3 space-y-3">
            {buildingStatus.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span
                  className={`font-medium flex items-center gap-1.5 ${
                    s.ok ? "text-success" : "text-warning"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      s.ok ? "bg-success" : "bg-warning"
                    } animate-pulse`}
                  />
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SecurityShell>
  );
}
