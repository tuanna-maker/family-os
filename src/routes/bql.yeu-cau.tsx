import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listBqlRequests, updateServiceRequestStatus } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/bql/yeu-cau")({ component: Page });

const STATUS_LABEL: Record<string, string> = {
  open: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã xong",
  closed: "Đã đóng",
};
const PRIORITY_TINT: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-warning",
  urgent: "text-emergency",
};

function Page() {
  const fn = useServerFn(listBqlRequests);
  const upd = useServerFn(updateServiceRequestStatus);
  const qc = useQueryClient();
  const { projectId } = useBqlProject();
  const [status, setStatus] = useState<"" | "open" | "in_progress" | "resolved" | "closed">("open");
  const { data, isLoading, error } = useQuery({
    queryKey: ["bql-requests", projectId, status],
    queryFn: () => fn({ data: { projectId: projectId || undefined, status: status || "all" } }),
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: "open" | "in_progress" | "resolved" | "closed" }) =>
      upd({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bql-requests"] });
      qc.invalidateQueries({ queryKey: ["bql-overview"] });
      toast.success("Đã cập nhật trạng thái");
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi cập nhật"),
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-tint-pink text-emergency grid place-items-center">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Yêu cầu dịch vụ</h1>
          <p className="text-xs text-muted-foreground">Tiếp nhận và xử lý yêu cầu của cư dân.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="open">Mới</option>
          <option value="in_progress">Đang xử lý</option>
          <option value="resolved">Đã xong</option>
          <option value="closed">Đã đóng</option>
          <option value="">Tất cả</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground self-center">{data?.rows.length ?? 0} yêu cầu</span>
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">Bạn cần quyền BQL để xem trang này.</div>
        ) : (data?.rows.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chưa có yêu cầu nào.</div>
        ) : (
          <ul className="divide-y divide-border">
            {data!.rows.map((r) => (
              <li key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.category}</Badge>
                    <span className={`text-[10px] uppercase font-semibold ${PRIORITY_TINT[r.priority] ?? ""}`}>
                      {r.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {r.project_name}
                    {r.apartment_code ? ` · ${r.apartment_code}` : ""} ·{" "}
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "open" ? "destructive" : r.status === "resolved" || r.status === "closed" ? "secondary" : "default"} className="text-[10px]">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                  <select
                    value={r.status}
                    disabled={mut.isPending}
                    onChange={(e) => mut.mutate({ id: r.id, status: e.target.value as any })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="open">Mới</option>
                    <option value="in_progress">Đang xử lý</option>
                    <option value="resolved">Đã xong</option>
                    <option value="closed">Đã đóng</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
