import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  SecurityShell,
  buildingStatus,
  buildingStatusIsDemo,
  securityMeta,
  securityServiceGrid,
  securityServiceCatalog,
  SecurityRequestsTracker,
  SecurityRequestDialog,
  type SecurityRequestKind,
} from "@/features/security-core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createSecurityRequest } from "@/lib/security.functions";
import { useAuth } from "@/hooks/use-auth";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/bao-an")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Dịch vụ bảo an — STOS Life" }] }),
  component: SecurityPage,
});

// Map service grid id → request_type enum
const TYPE_MAP: Record<string, SecurityRequestKind> = {
  sos: "sos",
  fire: "fire",
  stranger: "intrusion",
  package: "package",
  shipping: "other",
  tech: "other",
  call: "other",
  chat: "other",
};

type DialogState = {
  requestType: SecurityRequestKind;
  label: string;
  serviceGroup?: string;
  serviceItem?: string;
} | null;

function SecurityPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const sendRequest = useServerFn(createSecurityRequest);
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [sosConfirm, setSosConfirm] = useState(false);
  const [sosSending, setSosSending] = useState(false);

  function requireLogin(): boolean {
    if (session) return true;
    toast.error("Bạn cần đăng nhập để gọi bảo an");
    navigate({ to: "/login", search: { redirect: "/bao-an" } });
    return false;
  }

  function openDialog(s: NonNullable<DialogState>) {
    if (!requireLogin()) return;
    setDialog(s);
  }

  async function confirmSendSos() {
    setSosSending(true);
    try {
      await sendRequest({
        data: {
          request_type: "sos",
          payload: {
            label: "SOS khẩn cấp",
            submitted_at: new Date().toISOString(),
          },
        },
      });
      await qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã gửi SOS", {
        description: `Bảo an phản hồi trong ~${securityMeta.responseTimeMinutes} phút.`,
      });
      setSosConfirm(false);
    } catch (e) {
      toast.error("Không gửi được SOS", { description: (e as Error).message });
    } finally {
      setSosSending(false);
    }
  }

  return (
    <SecurityShell
      title="Có việc gì, cứ gọi em"
      subtitle={`Đội bảo an phản hồi trung bình trong ${securityMeta.responseTimeMinutes} phút`}
    >
      <section className="px-4 mt-4">
        <button
          onClick={() => {
            if (!requireLogin()) return;
            setSosConfirm(true);
          }}
          className="w-full rounded-3xl p-6 bg-gradient-to-br from-emergency to-pink text-white shadow-[var(--shadow-pop)] active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 grid place-items-center text-4xl ring-2 ring-white/30 shrink-0">
              🆘
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xl font-bold">Gọi SOS khẩn cấp</p>
              <p className="text-sm text-white/80 mt-0.5">Nhấn để kích hoạt — sẽ hỏi xác nhận</p>
            </div>
          </div>
        </button>
      </section>

      <section className="px-4 mt-3">
        <button
          onClick={() => navigate({ to: "/bao-ve" })}
          className="w-full rounded-3xl border border-border bg-card p-4 flex items-center gap-3 active:scale-[0.98] transition"
        >
          <div className="h-11 w-11 rounded-2xl bg-tint-blue grid place-items-center shrink-0">
            <span className="text-brand text-xl">🛡️</span>
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold">Đội bảo vệ chung cư</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Xem danh sách &amp; lịch trực bảo vệ trực thuộc chung cư bạn
            </p>
          </div>
          <span className="text-muted-foreground">›</span>
        </button>
      </section>

      <SecurityRequestsTracker />

      <section className="px-4 mt-4 grid grid-cols-2 gap-3">
        {securityServiceGrid.map(({ id, icon: Icon, label, desc, color, bg }) => {
          const type = TYPE_MAP[id] ?? "other";
          const onClick = () => {
            if (id === "package") {
              if (!requireLogin()) return;
              navigate({ to: "/nhan-hang-ho" });
              return;
            }
            if (id === "shipping") {
              if (!requireLogin()) return;
              navigate({ to: "/gui-hang-di" });
              return;
            }
            openDialog({ requestType: type, label, serviceGroup: "Truy cập nhanh", serviceItem: label });
          };
          return (
            <button
              key={id}
              onClick={onClick}
              className="rounded-3xl bg-card border border-border p-4 text-left active:scale-[0.98] transition"
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
                        onClick={() => {
                          if (it.id === "parcel-deliver") {
                            if (!requireLogin()) return;
                            navigate({ to: "/giao-tan-can-ho" });
                            return;
                          }
                          if (it.id === "parcel-receive") {
                            if (!requireLogin()) return;
                            navigate({ to: "/nhan-hang-ho" });
                            return;
                          }
                          if (it.id === "parcel-send") {
                            if (!requireLogin()) return;
                            navigate({ to: "/gui-hang-di" });
                            return;
                          }
                          if (it.id === "care-home") {
                            if (!requireLogin()) return;
                            navigate({ to: "/cham-soc-tai-nha" });
                            return;
                          }
                          if (it.id === "care-escort") {
                            if (!requireLogin()) return;
                            navigate({ to: "/dua-don-can-ho" });
                            return;
                          }
                          if (it.id === "freight-remote") {
                            if (!requireLogin()) return;
                            navigate({ to: "/chuyen-hang-tu-xa" });
                            return;
                          }
                          if (it.id === "rem-process") {
                            if (!requireLogin()) return;
                            navigate({ to: "/bao-ve-xu-ly-ho" });
                            return;
                          }
                          if (it.id === "priv-hourly") {
                            if (!requireLogin()) return;
                            navigate({ to: "/bao-ve-theo-gio" });
                            return;
                          }
                          if (it.id === "priv-custom") {
                            if (!requireLogin()) return;
                            navigate({ to: "/bao-ve-theo-nhu-cau-rieng" });
                            return;
                          }




                          openDialog({
                            requestType: "other",
                            label: `${group.title} · ${it.label}`,
                            serviceGroup: group.title,
                            serviceItem: it.label,
                          });
                        }}
                        className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/40 transition"
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
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trạng thái toà nhà
            </p>
            {buildingStatusIsDemo && (
              <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Demo
              </span>
            )}
          </div>
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
          {buildingStatusIsDemo && (
            <p className="text-[10px] text-muted-foreground mt-3">
              * Dữ liệu mẫu — chưa kết nối hệ thống PCCC / camera thật.
            </p>
          )}
        </div>
      </section>

      {dialog && (
        <SecurityRequestDialog
          open={!!dialog}
          onOpenChange={(v) => !v && setDialog(null)}
          requestType={dialog.requestType}
          label={dialog.label}
          serviceGroup={dialog.serviceGroup}
          serviceItem={dialog.serviceItem}
        />
      )}

      <AlertDialog open={sosConfirm} onOpenChange={setSosConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận gọi SOS khẩn cấp?</AlertDialogTitle>
            <AlertDialogDescription>
              Đội bảo an sẽ được điều động ngay lập tức. Chỉ dùng khi thực sự cần.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sosSending}>Không, huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmSendSos();
              }}
              disabled={sosSending}
              className="bg-emergency hover:bg-emergency/90 text-white"
            >
              {sosSending ? "Đang gửi…" : "Gọi ngay"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SecurityShell>
  );
}
