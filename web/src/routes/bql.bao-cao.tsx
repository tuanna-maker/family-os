import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getBqlOperationsReport, type OperationsReport } from "@/lib/bql.functions";
import { useBqlProject } from "@/lib/bql-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Building2, Users, ClipboardList, AlertTriangle,
  Wallet, Car, Download, TrendingUp, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/bql/bao-cao")({
  head: () => ({ meta: [{ title: "Báo cáo vận hành — BQL" }] }),
  component: ReportsScreen,
});

const CATEGORY_LABEL: Record<string, string> = {
  maintenance: "Bảo trì",
  cleaning: "Vệ sinh",
  security: "An ninh",
  utility: "Tiện ích",
  complaint: "Khiếu nại",
  other: "Khác",
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function ReportsScreen() {
  const { projectId, projects } = useBqlProject();
  const fetchFn = useServerFn(getBqlOperationsReport);
  const { data, isLoading } = useQuery<OperationsReport>({
    queryKey: ["bql-ops-report", projectId],
    queryFn: () => fetchFn({ data: { projectId: projectId || undefined, days: 30 } }),
  });

  const exportCsv = () => {
    if (!data) return;
    const rows: string[] = [];
    rows.push("Chỉ số,Giá trị");
    rows.push(`Số dự án,${data.projects_count}`);
    rows.push(`Số căn hộ,${data.apartments_count}`);
    rows.push(`Số hộ dân,${data.residents_count}`);
    rows.push(`Yêu cầu (30 ngày),${data.requests_total}`);
    rows.push(`YC đang mở,${data.requests_open}`);
    rows.push(`YC đang xử lý,${data.requests_in_progress}`);
    rows.push(`YC hoàn tất,${data.requests_done}`);
    rows.push(`YC vượt SLA,${data.requests_sla_breach}`);
    rows.push(`Sự cố (30 ngày),${data.incidents_total}`);
    rows.push(`Sự cố đang mở,${data.incidents_open}`);
    rows.push(`Sự cố nghiêm trọng,${data.incidents_critical}`);
    rows.push(`Tổng phí phát hành,${data.fees_total_amount}`);
    rows.push(`Đã thu,${data.fees_paid_amount}`);
    rows.push(`Công nợ,${data.fees_outstanding}`);
    rows.push(`Phí quá hạn,${data.fees_overdue_count}`);
    rows.push(`Pass khách hiệu lực,${data.visitor_passes_active}`);
    rows.push(`Pass khách đã dùng (30 ngày),${data.visitor_passes_used_30d}`);
    rows.push("");
    rows.push("Yêu cầu theo nhóm,Số lượng");
    data.requests_by_category.forEach(r => rows.push(`${CATEGORY_LABEL[r.category] ?? r.category},${r.count}`));
    rows.push("");
    rows.push("Phí theo dự án,Tổng,Đã thu,Còn lại");
    data.fees_by_project.forEach(f => rows.push(`${f.project_name},${f.total},${f.paid},${f.total - f.paid}`));

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bao-cao-van-hanh-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const projectName = projectId ? projects.find(p => p.id === projectId)?.name : "Tất cả dự án";
  const maxTrend = Math.max(1, ...(data?.requests_trend_14d ?? []).map(t => t.count));
  const collectionRate = data && data.fees_total_amount > 0
    ? Math.round((data.fees_paid_amount / data.fees_total_amount) * 100)
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Báo cáo vận hành
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Phạm vi: <span className="font-medium text-foreground">{projectName ?? "—"}</span> · Dữ liệu 30 ngày gần nhất
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={!data}>
          <Download className="h-3.5 w-3.5" /> Xuất CSV
        </Button>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Đang tải báo cáo...</p>
      ) : (
        <>
          {/* Tổng quan */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Tổng quan</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={<Building2 className="h-4 w-4" />} label="Dự án" value={data.projects_count} />
              <Stat icon={<Building2 className="h-4 w-4" />} label="Căn hộ" value={data.apartments_count} />
              <Stat icon={<Users className="h-4 w-4" />} label="Hộ đang ở" value={data.residents_count} />
              <Stat icon={<Car className="h-4 w-4" />} label="Pass khách HL" value={data.visitor_passes_active} />
            </div>
          </section>

          {/* Yêu cầu & sự cố */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Yêu cầu & sự cố (30 ngày)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={<ClipboardList className="h-4 w-4" />} label="Tổng YC" value={data.requests_total} />
              <Stat icon={<ClipboardList className="h-4 w-4 text-blue-500" />} label="Đang xử lý" value={data.requests_in_progress} />
              <Stat icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} label="Hoàn tất" value={data.requests_done} />
              <Stat
                icon={<AlertCircle className="h-4 w-4 text-red-500" />}
                label="Vượt SLA"
                value={data.requests_sla_breach}
                tone={data.requests_sla_breach > 0 ? "danger" : "default"}
              />
              <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Sự cố" value={data.incidents_total} />
              <Stat icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="SC đang mở" value={data.incidents_open} />
              <Stat
                icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                label="SC nghiêm trọng"
                value={data.incidents_critical}
                tone={data.incidents_critical > 0 ? "danger" : "default"}
              />
              <Stat icon={<Car className="h-4 w-4" />} label="Pass dùng/30d" value={data.visitor_passes_used_30d} />
            </div>
          </section>

          {/* Tài chính */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Tài chính</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Stat icon={<Wallet className="h-4 w-4" />} label="Tổng phí phát hành" value={fmtMoney(data.fees_total_amount) + " đ"} />
              <Stat icon={<Wallet className="h-4 w-4 text-emerald-500" />} label="Đã thu" value={fmtMoney(data.fees_paid_amount) + " đ"} />
              <Stat icon={<Wallet className="h-4 w-4 text-amber-500" />} label="Công nợ" value={fmtMoney(data.fees_outstanding) + " đ"} />
              <Stat
                icon={<AlertCircle className="h-4 w-4 text-red-500" />}
                label="Khoản quá hạn"
                value={data.fees_overdue_count}
                tone={data.fees_overdue_count > 0 ? "danger" : "default"}
              />
            </div>
            <Card className="p-4 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tỉ lệ thu phí</span>
                <span className="text-sm font-semibold">{collectionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, collectionRate)}%` }}
                />
              </div>
            </Card>
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trend */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3">Yêu cầu 14 ngày gần nhất</h3>
              {data.requests_trend_14d.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Chưa có dữ liệu</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {data.requests_trend_14d.map(t => (
                    <div key={t.date} className="flex-1 flex flex-col items-center gap-1" title={`${t.date}: ${t.count}`}>
                      <div
                        className="w-full rounded-t bg-primary/70 hover:bg-primary transition-all"
                        style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: t.count > 0 ? "4px" : "1px" }}
                      />
                      <span className="text-[9px] text-muted-foreground rotate-45 origin-left translate-y-2">
                        {t.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* By category */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3">Yêu cầu theo nhóm</h3>
              {data.requests_by_category.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-2">
                  {data.requests_by_category.map(r => {
                    const pct = Math.round((r.count / data.requests_total) * 100);
                    return (
                      <div key={r.category}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span>{CATEGORY_LABEL[r.category] ?? r.category}</span>
                          <span className="text-muted-foreground">{r.count} · {pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>

          {/* Fees by project */}
          {data.fees_by_project.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3">Phí theo dự án</h3>
              <div className="space-y-2">
                {data.fees_by_project.map(f => {
                  const pct = f.total > 0 ? Math.round((f.paid / f.total) * 100) : 0;
                  return (
                    <div key={f.project_name}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="font-medium truncate">{f.project_name}</span>
                        <span className="text-muted-foreground">
                          {fmtMoney(f.paid)} / {fmtMoney(f.total)} đ
                          <Badge variant="outline" className="ml-2 text-[10px]">{pct}%</Badge>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  icon, label, value, tone = "default",
}: { icon: React.ReactNode; label: string; value: number | string; tone?: "default" | "danger" }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}<span>{label}</span>
      </div>
      <div className={`text-lg font-semibold mt-1 ${tone === "danger" ? "text-red-500" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
