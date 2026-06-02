import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Hand, ChevronRight } from "lucide-react";
import { SubHeader } from "@/features/guard/SubHeader";
import { listGuardRequests, claimGuardRequest, resolveGuardRequest, type GuardRequestRow } from "@/lib/guard.functions";

export const Route = createFileRoute("/guard/requests")({
  head: () => ({ meta: [{ title: "Yêu cầu cư dân — Bảo vệ" }] }),
  loader: ({ context }) => {
    if (typeof window === "undefined") return;
    // Warm cache cho tab mặc định "open" — bỏ waterfall mount
    context.queryClient.prefetchQuery({
      queryKey: ["guard-requests", "open"],
      queryFn: () => listGuardRequests({ data: { scope: "open" } }),
    });
  },
  component: RequestsPage,
});

const TYPE_TONE: Record<string, string> = {
  sos: "bg-emergency/10 text-emergency",
  fire: "bg-emergency/10 text-emergency",
  intrusion: "bg-emergency/10 text-emergency",
  package: "bg-brand/10 text-brand",
  noise: "bg-warning/10 text-warning",
  other: "bg-muted text-foreground",
};
const TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Báo người lạ",
  package: "Nhận hàng hộ",
  noise: "Báo tiếng ồn",
  other: "Yêu cầu khác",
};
const PRIORITY_TONE: Record<string, string> = {
  P1: "bg-emergency text-white",
  P2: "bg-warning text-white",
  P3: "bg-muted text-foreground",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

function RequestsPage() {
  const [tab, setTab] = useState<"open" | "mine" | "resolved">("open");
  const qc = useQueryClient();
  const fetchFn = useServerFn(listGuardRequests);
  const claim = useServerFn(claimGuardRequest);
  const resolve = useServerFn(resolveGuardRequest);

  const q = useQuery({
    queryKey: ["guard-requests", tab],
    queryFn: () => fetchFn({ data: { scope: tab } }),
    refetchInterval: 20000,
  });

  const claimM = useMutation({
    mutationFn: (id: string) => claim({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã nhận xử lý");
      qc.invalidateQueries({ queryKey: ["guard-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resolveM = useMutation({
    mutationFn: (id: string) => resolve({ data: { id } }),
    onSuccess: () => {
      toast.success("Đã hoàn tất");
      qc.invalidateQueries({ queryKey: ["guard-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];

  return (
    <>
      <SubHeader title="YÊU CẦU CƯ DÂN" back="/guard" />
      <section className="px-5 mt-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {[
            { k: "open", label: "Đang mở" },
            { k: "mine", label: "Của tôi" },
            { k: "resolved", label: "Đã xong" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={`rounded-lg py-2 text-xs font-medium transition ${
                tab === t.k ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-4 space-y-2 pb-10">
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Đang tải...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Không có yêu cầu</p>
        ) : (
          rows.map((r) => <RequestCard key={r.id} r={r} tab={tab} onClaim={() => claimM.mutate(r.id)} onResolve={() => resolveM.mutate(r.id)} />)
        )}
      </section>
    </>
  );
}

function RequestCard({
  r,
  tab,
  onClaim,
  onResolve,
}: {
  r: GuardRequestRow;
  tab: "open" | "mine" | "resolved";
  onClaim: () => void;
  onResolve: () => void;
}) {
  const tone = TYPE_TONE[r.request_type] ?? "bg-muted text-foreground";
  const typeLabel = TYPE_LABEL[r.request_type] ?? r.request_type;
  const who = [r.building, r.apartment].filter(Boolean).join("-") || "Cư dân";
  const priorityTone = r.priority ? PRIORITY_TONE[r.priority] ?? "bg-muted" : null;
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <Link
        to="/guard/requests/$id"
        params={{ id: r.id }}
        className="block -m-4 p-4 active:bg-muted/40 transition"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            {priorityTone && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityTone}`}>
                {r.priority}
              </span>
            )}
            <p className="text-sm font-semibold truncate">Căn {who}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${tone}`}>{typeLabel}</span>
          {r.incident_type && r.incident_type !== typeLabel && (
            <span className="text-[11px] text-muted-foreground">· {r.incident_type}</span>
          )}
          {r.status === "in_progress" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">
              Đang xử lý
            </span>
          )}
        </div>
        {(r.ticket_code || r.team_name || r.note) && (
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
            {r.ticket_code && <span className="font-mono">{r.ticket_code}</span>}
            {r.team_name && <> · {r.team_name}</>}
            {r.note && <> · {r.note}</>}
          </p>
        )}
      </Link>
      {tab !== "resolved" && (
        <div className="mt-3 flex gap-2">
          {r.status === "open" && (
            <button
              onClick={onClaim}
              className="flex-1 h-9 rounded-lg bg-brand text-white text-xs font-semibold flex items-center justify-center gap-1"
            >
              <Hand className="h-3.5 w-3.5" /> Nhận
            </button>
          )}
          {(r.status === "in_progress" || tab === "mine") && (
            <button
              onClick={onResolve}
              className="flex-1 h-9 rounded-lg bg-success text-white text-xs font-semibold flex items-center justify-center gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Hoàn tất
            </button>
          )}
        </div>
      )}
    </div>
  );
}
