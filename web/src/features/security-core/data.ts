// ============================================================
// SECURITY CORE — Dữ liệu thuộc về vận hành & an ninh toà nhà
// SOS, cháy, kỹ thuật, nhận hàng, trạng thái hệ thống.
// ============================================================
import {
  AlertTriangle,
  Flame,
  MessageCircle,
  Package,
  Phone,
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
