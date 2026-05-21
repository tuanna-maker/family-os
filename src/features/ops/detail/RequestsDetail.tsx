import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, Search } from "lucide-react";
import { getOpsRequests, type RequestDetail } from "@/lib/console-stats.functions";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { cn } from "@/lib/utils";

const SEV: Record<string, string> = {
  urgent: "bg-emergency/10 text-emergency border-emergency/20",
  high: "bg-warning/10 text-warning border-warning/20",
  normal: "bg-info/10 text-info border-info/20",
  low: "bg-muted text-muted-foreground border-border",
};
const ST: Record<string, string> = {
  open: "bg-muted text-muted-foreground",
  in_progress: "bg-tint-blue text-brand",
  resolved: "bg-tint-green text-success",
  closed: "bg-muted text-muted-foreground",
};

export function RequestsDetail({
  title, subtitle, kind, backTo = "/ops",
}: { title: string; subtitle: string; kind: "complaint" | "work_order" | "all"; backTo?: string }) {
  const fn = useServerFn(getOpsRequests);
  const { can } = useMockAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ops-requests", kind],
    queryFn: () => fn({ data: { kind } }),
    refetchInterval: 30_000,
    retry: false,
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      open: list.filter((r) => r.status === "open").length,
      inProgress: list.filter((r) => r.status === "in_progress").length,
      resolved: list.filter((r) => r.status === "resolved").length,
    };
  }, [data]);

  if (!can("service_request.view")) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center">
        <Lock className="h-5 w-5 mx-auto text-muted-foreground" />
        <h2 className="text-[16px] font-semibold mt-2">Không có quyền xem</h2>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link to={backTo} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Quay lại
          </Link>
          <h1 className="text-[22px] font-bold mt-1">{title}</h1>
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Tổng", value: stats.total, cls: "text-foreground" },
          { label: "Chờ xử lý", value: stats.open, cls: "text-muted-foreground" },
          { label: "Đang thực hiện", value: stats.inProgress, cls: "text-brand" },
          { label: "Hoàn thành", value: stats.resolved, cls: "text-success" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={cn("text-[24px] font-bold tabular-nums mt-1", k.cls)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold">Danh sách chi tiết</h3>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Search className="h-3 w-3" /> 200 bản ghi gần nhất
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : isError ? (
          <p className="py-16 text-center text-xs text-muted-foreground">Không tải được dữ liệu.</p>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="py-16 text-center text-xs text-muted-foreground">Chưa có bản ghi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/50 text-muted-foreground text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Mã</th>
                  <th className="text-left px-4 py-2 font-medium">Tiêu đề</th>
                  <th className="text-left px-4 py-2 font-medium">Loại</th>
                  <th className="text-left px-4 py-2 font-medium">Căn hộ</th>
                  <th className="text-left px-4 py-2 font-medium">Mức độ</th>
                  <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-2 font-medium">Tạo lúc</th>
                </tr>
              </thead>
              <tbody>
                {data!.map((r: RequestDetail) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 font-medium max-w-[420px] truncate">{r.title}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.category}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.apartment_code ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-[10.5px] px-2 py-0.5 rounded-md border font-medium", SEV[r.priority] ?? SEV.normal)}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-[10.5px] px-2 py-0.5 rounded-md font-medium", ST[r.status] ?? ST.open)}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
