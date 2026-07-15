// ============================================================
// SECURITY CORE — Dữ liệu thuộc về vận hành & an ninh toà nhà
// SOS, cháy, kỹ thuật, nhận hàng, trạng thái hệ thống.
// ============================================================
import {
  AlertTriangle,
  Baby,
  BellRing,
  Boxes,
  Car,
  Clock,
  Flame,
  Lightbulb,
  MessageCircle,
  Package,
  ParkingCircle,
  Phone,
  Send,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";


export type SecurityTone = "emergency" | "warning" | "info" | "success";

export const securityQuickActions: {
  id: string;
  label: string;
  icon: string;
  tone: SecurityTone;
}[] = [
  { id: "sos", label: "SOS", icon: "🆘", tone: "emergency" },
  { id: "fire", label: "Báo cháy", icon: "🔥", tone: "warning" },
  { id: "package", label: "Nhận hàng", icon: "📦", tone: "info" },
  { id: "support", label: "Gọi hỗ trợ", icon: "📞", tone: "success" },
];

export const buildingStatus = [
  { label: "Hệ thống PCCC", value: "Hoạt động", ok: true },
  { label: "Camera an ninh", value: "32/32 online", ok: true },
  { label: "Thang máy", value: "4/4 hoạt động", ok: true },
  { label: "Cấp nước", value: "Bình thường", ok: true },
];

export const securityIncidents = [
  { id: "1", type: "SOS", who: "Căn A-1502", time: "2 phút", tone: "emergency" as const },
  { id: "2", type: "Nhận hàng", who: "Căn B-0807", time: "8 phút", tone: "info" as const },
  { id: "3", type: "Báo cháy", who: "Tầng 12", time: "1 giờ", tone: "warning" as const },
  { id: "4", type: "Hỗ trợ KT", who: "Căn C-0301", time: "2 giờ", tone: "success" as const },
];

export const securityMeta = {
  responseTimeMinutes: 2,
  hotline: "1900 6868",
  uptime: "98.9%",
};

export type SecurityServiceItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
  bg: string;
};

export const securityServiceGrid: SecurityServiceItem[] = [
  { id: "fire", icon: Flame, label: "Báo cháy", desc: "Cảnh báo khẩn cấp", color: "text-warning", bg: "bg-warning/10" },
  { id: "stranger", icon: AlertTriangle, label: "Báo người lạ", desc: "Đối tượng đáng ngờ", color: "text-emergency", bg: "bg-emergency/10" },
  { id: "package", icon: Package, label: "Nhận hàng hộ", desc: "Bưu phẩm, đồ ăn", color: "text-brand", bg: "bg-brand/10" },
  { id: "tech", icon: Wrench, label: "Hỗ trợ kỹ thuật", desc: "Điện, nước, internet", color: "text-info", bg: "bg-info/10" },
  { id: "call", icon: Phone, label: "Gọi bảo vệ", desc: `Hotline ${securityMeta.hotline}`, color: "text-success", bg: "bg-success/10" },
  { id: "chat", icon: MessageCircle, label: "Chat trực tiếp", desc: "Trả lời ngay", color: "text-pink", bg: "bg-pink/10" },
];

// ------------------------------------------------------------
// Catalog dịch vụ Bảo An (mở rộng) — render trong /bao-an.
// Mỗi nhóm là một section với 1–3 dịch vụ con.
// ------------------------------------------------------------
export type SecurityCatalogItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
};

export type SecurityCatalogGroup = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string; // text color token
  tint: string;   // bg tint token
  items: SecurityCatalogItem[];
};

export const securityServiceCatalog: SecurityCatalogGroup[] = [
  {
    id: "parcel",
    title: "Gửi / Nhận đồ",
    subtitle: "Tiếp nhận, bảo quản & giao tận căn",
    icon: Package,
    accent: "text-brand",
    tint: "bg-brand/10",
    items: [
      { id: "parcel-receive", icon: Package, label: "Nhận & giữ hàng hộ", desc: "Bưu phẩm, đồ ăn — bảo quản tại lễ tân" },
      { id: "parcel-deliver", icon: Truck, label: "Giao tận căn hộ", desc: "Bảo vệ mang hàng lên tận cửa" },
      { id: "parcel-send", icon: Send, label: "Gửi hàng đi", desc: "Hỗ trợ gửi hàng cho shipper / bưu cục" },
    ],
  },
  {
    id: "reminder",
    title: "Nhắc việc",
    subtitle: "Notification định kỳ & xử lý khi cư dân quên",
    icon: BellRing,
    accent: "text-info",
    tint: "bg-info/10",
    items: [
      { id: "rem-utility", icon: Lightbulb, label: "Nhắc tắt điện / nước", desc: "Theo khung giờ cư dân tự cài đặt" },
      { id: "rem-process", icon: ShieldCheck, label: "Bảo vệ xử lý khi quên", desc: "Bảo vệ kiểm tra & gửi xác nhận lại" },
    ],
  },
  {
    id: "care",
    title: "Hỗ trợ người lớn tuổi & trẻ em",
    subtitle: "Đồng hành an toàn trong toà nhà",
    icon: Users,
    accent: "text-pink",
    tint: "bg-pink/10",
    items: [
      { id: "care-home", icon: UserCheck, label: "Chăm sóc tại nhà", desc: "Hỗ trợ ông bà / bé khi gia đình vắng" },
      { id: "care-escort", icon: Baby, label: "Đưa đón lên / xuống căn hộ", desc: "Dẫn ông bà, bé đi thang máy an toàn" },
    ],
  },
  {
    id: "freight",
    title: "Vận chuyển hàng hoá",
    subtitle: "Đăng ký thang hàng & nhân lực hỗ trợ",
    icon: Boxes,
    accent: "text-warning",
    tint: "bg-warning/10",
    items: [
      { id: "freight-remote", icon: Truck, label: "Chuyển hàng từ xa", desc: "Đăng ký trước — bảo vệ hỗ trợ tiếp nhận" },
      { id: "freight-lift", icon: Boxes, label: "Thang hàng + người hỗ trợ", desc: "Giữ thang, bốc xếp giúp cư dân" },
    ],
  },
  {
    id: "parking",
    title: "Hỗ trợ tìm & sắp xếp xe",
    subtitle: "Bãi xe gọn gàng — lấy xe nhanh",
    icon: Car,
    accent: "text-success",
    tint: "bg-success/10",
    items: [
      { id: "park-arrange", icon: ParkingCircle, label: "Sắp xe đúng vị trí", desc: "Bảo vệ điều phối, tối ưu chỗ đậu" },
      { id: "park-find", icon: Car, label: "Tìm xe nhanh", desc: "Hỗ trợ định vị xe trong bãi" },
    ],
  },
  {
    id: "private",
    title: "Bảo an theo giờ / nhu cầu riêng",
    subtitle: "Thuê bảo vệ riêng cho sự kiện, đón khách VIP…",
    icon: Clock,
    accent: "text-emergency",
    tint: "bg-emergency/10",
    items: [
      { id: "priv-hourly", icon: Clock, label: "Bảo vệ theo giờ", desc: "Đặt lịch theo khung giờ cần" },
      { id: "priv-custom", icon: ShieldCheck, label: "Theo nhu cầu riêng", desc: "Yêu cầu đặc biệt — đội bảo an chuyên trách" },
    ],
  },
];

