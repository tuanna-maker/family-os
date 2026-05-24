import { AlertTriangle, Activity, Database, Server, ArrowRight } from "lucide-react";

const ALERTS = [
  { icon: AlertTriangle, color: "text-warning", tint: "bg-tint-orange",
    title: "Tenant vượt hạn mức lưu trữ", desc: "Vinhomes Ocean Park", time: "5 phút trước" },
  { icon: Activity, color: "text-emergency", tint: "bg-tint-red",
    title: "Tỉ lệ lỗi API tăng cao", desc: "API /v1/visitor/qr", time: "15 phút trước" },
  { icon: AlertTriangle, color: "text-warning", tint: "bg-tint-orange",
    title: "SLA Incident vượt ngưỡng", desc: "Sunshine City · Response time", time: "20 phút trước" },
  { icon: Database, color: "text-info", tint: "bg-tint-blue",
    title: "Storage sắp đầy", desc: "3 tenants", time: "1 giờ trước" },
  { icon: Server, color: "text-success", tint: "bg-tint-green",
    title: "Patch hệ thống đã sẵn sàng", desc: "Vui lòng cập nhật", time: "2 giờ trước" },
];

export function AlertsPanel() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold">Cảnh báo &amp; sự kiện quan trọng</h3>
        <button className="text-[11.5px] text-brand font-medium hover:underline">Xem tất cả</button>
      </div>
      <ul className="space-y-3 flex-1">
        {ALERTS.map((a, i) => {
          const Icon = a.icon;
          return (
            <li key={i} className="flex items-start gap-3">
              <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${a.tint}`}>
                <Icon className={`h-4 w-4 ${a.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate">{a.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{a.desc}</p>
              </div>
              <span className="text-[10.5px] text-muted-foreground whitespace-nowrap pt-1">{a.time}</span>
            </li>
          );
        })}
      </ul>
      <button className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand font-medium">
        Xem tất cả cảnh báo <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
