// ============================================================
// ADMIN — Mock dữ liệu cho bảng quản trị (overview, family, security).
// ============================================================
import {
  Activity,
  Baby,
  Flame,
  Heart,
  ShieldCheck,
  Siren,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AdminKpi = {
  label: string;
  value: string;
  delta?: string;
  color: string;
  bg: string;
  icon: LucideIcon;
};

export const overviewKpis: AdminKpi[] = [
  { label: "Tổng gia đình", value: "2,847", delta: "+12.4%", color: "text-brand", bg: "bg-tint-blue", icon: TrendingUp },
  { label: "Người dùng (DAU)", value: "8,231", delta: "+5.1%", color: "text-success", bg: "bg-tint-green", icon: TrendingUp },
  { label: "Yêu cầu hỗ trợ", value: "126", delta: "-8.0%", color: "text-warning", bg: "bg-tint-orange", icon: TrendingUp },
  { label: "Tỉ lệ giữ chân", value: "94%", delta: "+1.2%", color: "text-pink", bg: "bg-tint-pink", icon: TrendingUp },
];

export const userGrowthSeries = [40, 55, 48, 70, 62, 75, 68, 82, 78, 88, 92, 100, 95, 110];

export type RecentRequest = {
  type: string;
  who: string;
  time: string;
  tone: "emergency" | "info" | "warning" | "success";
};

export const recentRequests: RecentRequest[] = [
  { type: "SOS", who: "Căn A-1502", time: "2 phút", tone: "emergency" },
  { type: "Nhận hàng", who: "Căn B-0807", time: "8 phút", tone: "info" },
  { type: "Báo cháy", who: "Tầng 12", time: "1 giờ", tone: "warning" },
  { type: "Hỗ trợ KT", who: "Căn C-0301", time: "2 giờ", tone: "success" },
];

export const moduleOverview = [
  { title: "Family Core", desc: "Tài chính, sức khỏe, con cái, ông bà", value: "12 modules", tint: "bg-tint-blue" },
  { title: "Security Core", desc: "SOS, cháy, hỗ trợ, kỹ thuật", value: "98.9% uptime", tint: "bg-tint-purple" },
];

export type FamilyModule = {
  icon: LucideIcon;
  label: string;
  users: string;
  active: string;
  tint: string;
  color: string;
};

export const familyModules: FamilyModule[] = [
  { icon: Wallet, label: "Chi tiêu", users: "2,134", active: "94%", tint: "bg-tint-blue", color: "text-brand" },
  { icon: Heart, label: "Sức khỏe", users: "1,802", active: "87%", tint: "bg-tint-pink", color: "text-pink" },
  { icon: Baby, label: "Đồng hành con", users: "1,247", active: "76%", tint: "bg-tint-orange", color: "text-warning" },
  { icon: Activity, label: "Thực phẩm", users: "986", active: "62%", tint: "bg-tint-green", color: "text-success" },
];

export type SecurityKpi = { icon: LucideIcon; label: string; value: string; tint: string; color: string };

export const securityKpis: SecurityKpi[] = [
  { icon: Siren, label: "SOS hôm nay", value: "3", tint: "bg-tint-pink", color: "text-emergency" },
  { icon: Flame, label: "Báo cháy", value: "0", tint: "bg-tint-orange", color: "text-warning" },
  { icon: Wrench, label: "Hỗ trợ kỹ thuật", value: "12", tint: "bg-tint-blue", color: "text-brand" },
  { icon: ShieldCheck, label: "Uptime", value: "99.98%", tint: "bg-tint-green", color: "text-success" },
];

export type AdminIncident = {
  id: string;
  type: string;
  who: string;
  at: string;
  status: string;
  tone: string;
};

export const adminIncidents: AdminIncident[] = [
  { id: "INC-2041", type: "SOS", who: "Căn A-1502", at: "10:42", status: "Đang xử lý", tone: "bg-emergency" },
  { id: "INC-2040", type: "Báo cháy giả", who: "Tầng 12", at: "09:15", status: "Đã đóng", tone: "bg-success" },
  { id: "INC-2039", type: "Hỗ trợ KT", who: "Căn C-0301", at: "08:50", status: "Đã xử lý", tone: "bg-success" },
  { id: "INC-2038", type: "Nhận hàng", who: "Căn B-0807", at: "08:12", status: "Hoàn tất", tone: "bg-brand" },
];
