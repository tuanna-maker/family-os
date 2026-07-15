import { Link } from "@tanstack/react-router";
import {
  Building, Building2, ShieldCheck, Users2, HeartPulse, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EcosystemCard {
  index: number;
  title: string;
  desc: string;
  tint: string;
  iconColor: string;
  icon: typeof Building;
  bullets: string[];
  link?: { label: string; to: string; external?: boolean };
}

const CARDS: EcosystemCard[] = [
  {
    index: 1, title: "Nền tảng quản trị", icon: Building,
    tint: "bg-tint-blue", iconColor: "text-brand",
    desc: "Quản lý tenant, dự án, gói dịch vụ, thanh toán, tích hợp, nhật ký hệ thống.",
    bullets: ["Quản lý tenant", "Gói dịch vụ & Đăng ký", "Giám sát sử dụng", "Tích hợp hệ thống", "Nhật ký hoạt động"],
    link: { label: "Vào Console", to: "/console" },
  },
  {
    index: 2, title: "Vận hành cộng đồng", icon: Building2,
    tint: "bg-tint-green", iconColor: "text-success",
    desc: "Quản lý toà nhà, dịch vụ, yêu cầu, sự cố, thu phí & tài chính.",
    bullets: ["Quản lý cư dân", "Toà nhà & Căn hộ", "Yêu cầu dịch vụ", "Tiện ích & Đặt chỗ", "Thu phí & Công nợ"],
    link: { label: "Vào Console", to: "/bql", external: true },
  },
  {
    index: 3, title: "Vận hành an ninh", icon: ShieldCheck,
    tint: "bg-tint-orange", iconColor: "text-warning",
    desc: "Quản lý lực lượng bảo vệ, tuần tra, kiểm soát ra vào và sự cố an ninh.",
    bullets: ["Quản lý lực lượng bảo vệ", "Ca trực & Lịch làm việc", "Tuần tra & Điểm kiểm tra",
      "Kiểm soát ra vào (QR/NFC)", "Trung tâm sự cố an ninh"],
    link: { label: "Vào Console", to: "/bql/an-ninh", external: true },
  },
  {
    index: 4, title: "Dịch vụ cư dân", icon: Users2,
    tint: "bg-tint-purple", iconColor: "text-[oklch(0.55_0.18_295)]",
    desc: "Cổng thông tin cư dân, thanh toán, yêu cầu, thông báo, tiện ích.",
    bullets: ["Cổng thông tin cư dân", "Yêu cầu dịch vụ", "Thanh toán & Công nợ", "Tiện ích & Đặt chỗ", "Thông báo & Truyền thông"],
    link: { label: "Vào Portal", to: "/portal", external: true },
  },
  {
    index: 5, title: "Family Core", icon: HeartPulse,
    tint: "bg-tint-pink", iconColor: "text-pink",
    desc: "Dịch vụ gia đình: sức khỏe, lịch, chi tiêu, thông báo, cùng con...",
    bullets: ["Calendar gia đình", "Chăm sóc người cao tuổi", "Quản lý người giúp việc",
      "Quản lý chi tiêu", "Kỷ niệm gia đình"],
    link: { label: "Vào Family Core", to: "/admin/family", external: true },
  },
];

export function EcosystemStrip() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
      <h3 className="text-[14px] font-semibold mb-4">
        Hệ sinh thái STOS Life — <span className="text-muted-foreground font-medium">5 phân hệ chính</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.index} className={cn("rounded-xl border border-border p-4 flex flex-col", c.tint)}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white grid place-items-center">
                  <Icon className={cn("h-4 w-4", c.iconColor)} />
                </div>
                <p className="text-[13px] font-semibold">
                  <span className={cn("mr-1", c.iconColor)}>{c.index}</span>
                  {c.title}
                </p>
              </div>
              <p className="text-[11.5px] text-foreground/70 mt-2 leading-snug">{c.desc}</p>
              <ul className="mt-3 space-y-1 text-[11.5px] text-foreground/80 flex-1">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <span className={cn("mt-1.5 h-1 w-1 rounded-full shrink-0", c.iconColor)} style={{ backgroundColor: "currentColor" }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {c.link && (
                c.link.external ? (
                  <a href={c.link.to} className={cn("mt-3 inline-flex items-center gap-1 text-[12px] font-semibold", c.iconColor)}>
                    {c.link.label} <ArrowRight className="h-3 w-3" />
                  </a>
                ) : (
                  <Link to={c.link.to} className={cn("mt-3 inline-flex items-center gap-1 text-[12px] font-semibold", c.iconColor)}>
                    {c.link.label} <ArrowRight className="h-3 w-3" />
                  </Link>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
