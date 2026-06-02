import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getOpsStats } from "@/lib/console-stats.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ops/occupancy")({
  head: () => ({ meta: [{ title: "Tỷ lệ lấp đầy — STOS Ops" }] }),
  component: OccupancyDetail,
});

function OccupancyDetail() {
  const fn = useServerFn(getOpsStats);
  const { data, isLoading } = useQuery({
    queryKey: ["ops-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000, retry: false,
  });

  const blocks = data?.occupancy_by_block ?? [];
  const totalApts = blocks.reduce((s, b) => s + b.total, 0);
  const totalOcc = blocks.reduce((s, b) => s + b.occupied, 0);
  const vacancy = totalApts - totalOcc;

  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <div>
        <Link to="/ops" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Quay lại
        </Link>
        <h1 className="text-[22px] font-bold mt-1">Tỷ lệ lấp đầy</h1>
        <p className="text-[12px] text-muted-foreground">Chi tiết theo từng tòa / block</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Tổng căn hộ", value: totalApts, cls: "text-foreground" },
          { label: "Đã ở", value: totalOcc, cls: "text-success" },
          { label: "Trống", value: vacancy, cls: "text-warning" },
          { label: "Tỷ lệ lấp đầy", value: `${data?.occupancy_pct ?? 0}%`, cls: "text-brand" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={cn("text-[24px] font-bold tabular-nums mt-1", k.cls)}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold">Lấp đầy theo tòa</h3>
        </div>
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : blocks.length === 0 ? (
          <p className="py-16 text-center text-xs text-muted-foreground">Chưa có dữ liệu tòa.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="bg-muted/50 text-muted-foreground text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2">Tòa</th>
                <th className="text-right px-4 py-2">Tổng căn</th>
                <th className="text-right px-4 py-2">Đã ở</th>
                <th className="text-right px-4 py-2">Trống</th>
                <th className="text-left px-4 py-2 w-[40%]">Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.block_id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{b.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{b.total}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-success">{b.occupied}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-warning">{b.total - b.occupied}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full",
                            b.pct >= 95 ? "bg-success" : b.pct >= 85 ? "bg-brand" : "bg-warning")}
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-[11px] font-semibold w-10 text-right">{b.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
