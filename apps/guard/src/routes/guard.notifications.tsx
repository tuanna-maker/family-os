import { createFileRoute } from "@tanstack/react-router";
import { Bell, Home, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGuardNotifications } from "@/hooks/use-guard-notifications";
import { markPlatformRead, type PlatformNotification } from "@/api/notifications";

const RESIDENT_TOPICS = ["sos.triggered", "sos.fire", "sos.resident_request"];

function formatWhen(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ`;
  return d.toLocaleDateString("vi-VN");
}

function toneFor(n: PlatformNotification) {
  if (n.topic.startsWith("sos.")) return "bg-emergency/10 text-emergency";
  if (n.topic.includes("shift") || n.topic.includes("schedule")) return "bg-warning/10 text-warning";
  if (n.topic.includes("approved")) return "bg-success/10 text-success";
  return "bg-brand/10 text-brand";
}

function List({
  items,
  onOpen,
}: {
  items: PlatformNotification[];
  onOpen: (n: PlatformNotification) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground">
        Chưa có thông báo
      </p>
    );
  }
  return (
    <section className="px-5 space-y-2">
      {items.map((n) => (
        <button
          type="button"
          key={n.id}
          onClick={() => onOpen(n)}
          className={`w-full rounded-2xl bg-card border border-border p-4 flex gap-3 text-left ${
            n.read_at ? "opacity-70" : ""
          }`}
        >
          <div className={`h-10 w-10 rounded-full grid place-items-center shrink-0 ${toneFor(n)}`}>
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{n.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {[n.body, formatWhen(n.created_at)].filter(Boolean).join(" · ")}
            </p>
          </div>
        </button>
      ))}
    </section>
  );
}

function GuardNotifications() {
  const [tab, setTab] = useState<"resident" | "company">("resident");
  const { items, isLoading } = useGuardNotifications();
  const qc = useQueryClient();

  const readMut = useMutation({
    mutationFn: (id: string) => markPlatformRead({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guard-notifications"] });
      qc.invalidateQueries({ queryKey: ["guard-notifications-unread"] });
    },
  });

  const { resident, company } = useMemo(() => {
    const residentItems = items.filter((n) => RESIDENT_TOPICS.includes(n.topic));
    const companyItems = items.filter((n) => !RESIDENT_TOPICS.includes(n.topic));
    return { resident: residentItems, company: companyItems };
  }, [items]);

  const shown = tab === "resident" ? resident : company;

  return (
    <>
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold">Thông báo</h1>
      </header>
      <div className="px-5 pb-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            onClick={() => setTab("resident")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
              tab === "resident" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Home className="h-4 w-4" />
            Yêu cầu cư dân
          </button>
          <button
            onClick={() => setTab("company")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
              tab === "company" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Thông báo công ty
          </button>
        </div>
      </div>
      {isLoading ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <List
          items={shown}
          onOpen={(n) => {
            if (!n.read_at) readMut.mutate(n.id);
          }}
        />
      )}
    </>
  );
}

export const Route = createFileRoute("/guard/notifications")({
  head: () => ({ meta: [{ title: "Thông báo — Bảo vệ" }] }),
  component: GuardNotifications,
});
