import { createFileRoute } from "@tanstack/react-router";
import { Bell, Home, Building2 } from "lucide-react";
import { useState } from "react";

type Item = { t: string; d: string; tone: string };

const residentRequests: Item[] = [
  { t: "Yêu cầu mới từ căn A-1502", d: "Nhận hàng hộ · 2 phút", tone: "bg-brand/10 text-brand" },
  { t: "Yêu cầu từ căn B-0803", d: "Mở cửa khách · 15 phút", tone: "bg-brand/10 text-brand" },
  { t: "Yêu cầu từ căn C-2201", d: "Hỗ trợ chuyển đồ · 1 giờ", tone: "bg-brand/10 text-brand" },
];

const companyNotices: Item[] = [
  { t: "Đổi ca với Lê Minh Đức", d: "Đã được duyệt · 1 giờ", tone: "bg-success/10 text-success" },
  { t: "Thông báo họp giao ca", d: "07:00 sáng mai · 3 giờ", tone: "bg-warning/10 text-warning" },
  { t: "Cập nhật quy định tuần tra", d: "Từ phòng An ninh · hôm qua", tone: "bg-muted text-foreground" },
];

function List({ items }: { items: Item[] }) {
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
        <div key={n.t} className="rounded-2xl bg-card border border-border p-4 flex gap-3">
          <div className={`h-10 w-10 rounded-full grid place-items-center ${n.tone}`}>
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{n.t}</p>
            <p className="text-[11px] text-muted-foreground">{n.d}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function GuardNotifications() {
  const [tab, setTab] = useState<"resident" | "company">("resident");
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
      <List items={tab === "resident" ? residentRequests : companyNotices} />
    </>
  );
}

export const Route = createFileRoute("/guard/notifications")({
  head: () => ({ meta: [{ title: "Thông báo — Bảo vệ" }] }),
  component: GuardNotifications,
});
