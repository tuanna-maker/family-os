import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Clock, Activity, X } from "lucide-react";
import { listSecurityRequests, type SecurityRequest } from "@/lib/security.functions";
import { useAuth } from "@/hooks/use-auth";

const TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Người lạ",
  noise: "Tiếng ồn",
  package: "Nhận hàng",
  other: "Yêu cầu khác",
};

const TYPE_EMOJI: Record<string, string> = {
  sos: "🆘",
  fire: "🔥",
  intrusion: "⚠️",
  noise: "🔊",
  package: "📦",
  other: "📞",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Đã gửi · chờ điều phối",
  in_progress: "Bảo an đang xử lý",
  resolved: "Đã giải quyết",
  cancelled: "Đã huỷ",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-tint-orange text-warning",
  in_progress: "bg-tint-blue text-brand",
  resolved: "bg-tint-green text-success",
  cancelled: "bg-muted text-muted-foreground",
};

function fmtElapsed(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export function SecurityRequestsTracker() {
  const { session } = useAuth();
  const fetchList = useServerFn(listSecurityRequests);

  const q = useQuery({
    queryKey: ["security-requests", session?.user?.id ?? "anon"],
    queryFn: () => fetchList(),
    enabled: !!session,
    refetchInterval: 10_000,
  });

  const items = useMemo<SecurityRequest[]>(() => {
    const all = q.data ?? [];
    // Lọc riêng yêu cầu của chính mình (RLS đã giới hạn, đây chỉ là cẩn thận với staff)
    return session
      ? all.filter((r) => r.requester_id === session.user.id).slice(0, 5)
      : [];
  }, [q.data, session]);

  if (!session) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-end justify-between px-1 mb-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Trạng thái điều phối</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Yêu cầu của bạn — cập nhật mỗi 10 giây
          </p>
        </div>
        {q.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {q.isLoading ? (
        <div className="rounded-3xl bg-card border border-border p-6 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-card border border-border p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-tint-green grid place-items-center">
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold">Chưa có yêu cầu nào đang mở</p>
            <p className="text-[11px] text-muted-foreground">
              Khi bạn gửi SOS, trạng thái sẽ hiển thị ở đây.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <RequestRow key={r.id} req={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function RequestRow({ req }: { req: SecurityRequest }) {
  const Icon =
    req.status === "resolved"
      ? ShieldCheck
      : req.status === "cancelled"
        ? X
        : req.status === "in_progress"
          ? Activity
          : Clock;
  return (
    <div className="rounded-3xl bg-card border border-border p-4 flex items-center gap-3">
      <div className="h-11 w-11 rounded-2xl bg-tint-red grid place-items-center text-2xl shrink-0">
        {TYPE_EMOJI[req.request_type] ?? "📞"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">
            {TYPE_LABEL[req.request_type] ?? req.request_type}
          </p>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${STATUS_TONE[req.status] ?? "bg-muted"}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {STATUS_LABEL[req.status] ?? req.status}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Gửi {fmtElapsed(req.created_at)}
          {req.resolved_at && ` · xong ${fmtElapsed(req.resolved_at)}`}
        </p>
      </div>
    </div>
  );
}
