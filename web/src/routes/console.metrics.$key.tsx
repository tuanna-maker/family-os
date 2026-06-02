import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Building2, Building, Layers, Home, Users2, ClipboardList, AlertTriangle, Shield } from "lucide-react";
import { getPlatformStats } from "@/lib/console-stats.functions";
import { cn } from "@/lib/utils";

const META: Record<string, { title: string; subtitle: string; key: keyof Awaited<ReturnType<typeof getPlatformStats>>; icon: any; cls: string }> = {
  tenants: { title: "Tenants", subtitle: "Số tổ chức / doanh nghiệp đang dùng STOS", key: "tenants", icon: Building2, cls: "text-brand" },
  projects: { title: "Dự án", subtitle: "Tổng số dự án bất động sản", key: "projects", icon: Building, cls: "text-brand" },
  blocks: { title: "Tòa nhà", subtitle: "Tổng số tòa / block", key: "blocks", icon: Layers, cls: "text-info" },
  apartments: { title: "Căn hộ", subtitle: "Tổng số căn hộ trong nền tảng", key: "apartments", icon: Home, cls: "text-success" },
  residents: { title: "Cư dân", subtitle: "Số cư dân đang sinh sống", key: "residents", icon: Users2, cls: "text-success" },
  "requests-open": { title: "Yêu cầu đang mở", subtitle: "Service requests chờ xử lý", key: "requests_open", icon: ClipboardList, cls: "text-warning" },
  "incidents-open": { title: "Sự cố khẩn", subtitle: "Yêu cầu mức ưu tiên urgent chưa xử lý", key: "incidents_open", icon: AlertTriangle, cls: "text-emergency" },
  "security-open": { title: "Cảnh báo an ninh", subtitle: "Security requests đang mở / xử lý", key: "security_open", icon: Shield, cls: "text-emergency" },
};

export const Route = createFileRoute("/console/metrics/$key")({
  beforeLoad: ({ params }) => {
    if (!META[params.key]) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: `${META[params.key]?.title ?? "Metric"} — STOS Platform` }],
  }),
  component: MetricDetail,
});

function MetricDetail() {
  const { key } = Route.useParams();
  const meta = META[key];
  const fn = useServerFn(getPlatformStats);
  const { data, isLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000, retry: false,
  });

  const value = data?.[meta.key] ?? 0;
  const Icon = meta.icon;

  return (
    <div className="p-5 space-y-4 max-w-[1200px] mx-auto">
      <div>
        <Link to="/console" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Quay lại Platform Console
        </Link>
        <h1 className="text-[22px] font-bold mt-1">{meta.title}</h1>
        <p className="text-[12px] text-muted-foreground">{meta.subtitle}</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-8 shadow-soft flex items-center gap-6">
        <div className={cn("h-16 w-16 rounded-2xl bg-muted grid place-items-center", meta.cls)}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tổng số hiện tại</p>
          <p className={cn("text-[44px] font-bold tabular-nums leading-none mt-1", meta.cls)}>
            {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : value.toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <h3 className="text-[14px] font-semibold mb-2">Phân tích chi tiết</h3>
        <p className="text-[12px] text-muted-foreground">
          Drill-down theo tenant / dự án / thời gian sẽ được bổ sung khi dữ liệu lịch sử khả dụng (yêu cầu bảng <code>stats_snapshots</code>).
        </p>
      </div>
    </div>
  );
}
