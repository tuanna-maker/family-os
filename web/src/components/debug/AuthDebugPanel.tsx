import { useEffect, useState } from "react";

type AuthEvent = {
  t: string;
  event: string;
  userId: string | null;
  email: string | null;
  expiresAt: string | null;
  prevUserId?: string | null;
  nextUserId?: string | null;
  willInvalidate?: boolean;
};

const COLORS: Record<string, string> = {
  INITIAL_SESSION: "#94a3b8",
  BOOTSTRAP_SESSION: "#64748b",
  SIGNED_IN: "#10b981",
  SIGNED_OUT: "#ef4444",
  TOKEN_REFRESHED: "#3b82f6",
  USER_UPDATED: "#a855f7",
  PASSWORD_RECOVERY: "#f59e0b",
};

/**
 * Bảng debug auth — chỉ hiện trong dev hoặc khi đặt
 *   localStorage.setItem("auth:debug", "1")
 * Bấm Alt+A để ẩn/hiện.
 */
export function AuthDebugPanel() {
  const enabled =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && localStorage.getItem("auth:debug") === "1");
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const w = window as unknown as { __authEvents?: AuthEvent[] };
    setEvents([...(w.__authEvents ?? [])]);
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<AuthEvent>).detail;
      setEvents((prev) => [...prev.slice(-199), detail]);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "a" || e.key === "A")) setOpen((v) => !v);
    };
    window.addEventListener("auth:event", onEvt);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("auth:event", onEvt);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);

  if (!enabled || !open) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        width: 320,
        maxHeight: 280,
        background: "rgba(15,23,42,0.95)",
        color: "#e2e8f0",
        font: "11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace",
        borderRadius: 12,
        padding: 10,
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <strong style={{ color: "#60a5fa" }}>auth events · {events.length}</strong>
        <span style={{ opacity: 0.6 }}>Alt+A để ẩn</span>
      </div>
      {/* Timeline */}
      <div style={{ display: "flex", gap: 2, height: 14, marginBottom: 8 }}>
        {events.slice(-80).map((e, i) => (
          <div
            key={i}
            title={`${e.event} · ${e.t}`}
            style={{
              flex: 1,
              minWidth: 2,
              background: COLORS[e.event] ?? "#cbd5e1",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
      {/* List */}
      <div style={{ maxHeight: 200, overflow: "auto" }}>
        {events
          .slice(-20)
          .reverse()
          .map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0" }}>
              <span style={{ color: COLORS[e.event] ?? "#cbd5e1", minWidth: 130 }}>
                ● {e.event}
              </span>
              <span style={{ opacity: 0.6 }}>{e.t.slice(11, 19)}</span>
              <span style={{ marginLeft: "auto", opacity: 0.8 }}>
                {e.email ?? (e.userId ? e.userId.slice(0, 6) : "—")}
                {e.willInvalidate ? " ↻" : ""}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
