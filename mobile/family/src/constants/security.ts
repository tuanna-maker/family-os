import type { LucideIcon } from "lucide-react-native";
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
} from "lucide-react-native";

export const securityMeta = {
  responseTimeMinutes: 2,
  hotline: "1900 6868",
};

export const buildingStatus = [
  { label: "Hệ thống PCCC", value: "Hoạt động", ok: true },
  { label: "Camera an ninh", value: "32/32 online", ok: true },
  { label: "Thang máy", value: "4/4 hoạt động", ok: true },
  { label: "Cấp nước", value: "Bình thường", ok: true },
];

export type SecurityGridItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  requestType: "sos" | "fire" | "intrusion" | "noise" | "package" | "other";
  iconColorKey: "warning" | "emergency" | "brand" | "success" | "pink";
  tintKey: "tintOrange" | "tintRed" | "tintBlue" | "tintGreen" | "tintPink";
  action: "trigger" | "call" | "chat";
};

export const securityServiceGrid: SecurityGridItem[] = [
  {
    id: "fire",
    icon: Flame,
    label: "Báo cháy",
    desc: "Cảnh báo khẩn cấp",
    requestType: "fire",
    iconColorKey: "warning",
    tintKey: "tintOrange",
    action: "trigger",
  },
  {
    id: "stranger",
    icon: AlertTriangle,
    label: "Báo người lạ",
    desc: "Đối tượng đáng ngờ",
    requestType: "intrusion",
    iconColorKey: "emergency",
    tintKey: "tintRed",
    action: "trigger",
  },
  {
    id: "package",
    icon: Package,
    label: "Nhận hàng hộ",
    desc: "Bưu phẩm, đồ ăn",
    requestType: "package",
    iconColorKey: "brand",
    tintKey: "tintBlue",
    action: "trigger",
  },
  {
    id: "tech",
    icon: Wrench,
    label: "Hỗ trợ kỹ thuật",
    desc: "Điện, nước, internet",
    requestType: "other",
    iconColorKey: "brand",
    tintKey: "tintBlue",
    action: "trigger",
  },
  {
    id: "call",
    icon: Phone,
    label: "Gọi bảo vệ",
    desc: `Hotline ${securityMeta.hotline}`,
    requestType: "other",
    iconColorKey: "success",
    tintKey: "tintGreen",
    action: "call",
  },
  {
    id: "chat",
    icon: MessageCircle,
    label: "Chat trực tiếp",
    desc: "Trả lời ngay",
    requestType: "other",
    iconColorKey: "pink",
    tintKey: "tintPink",
    action: "chat",
  },
];

export type SecurityCatalogItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  requestType: SecurityGridItem["requestType"];
};

export type SecurityCatalogGroup = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accentKey: SecurityGridItem["iconColorKey"];
  tintKey: SecurityGridItem["tintKey"];
  items: SecurityCatalogItem[];
};

export const securityServiceCatalog: SecurityCatalogGroup[] = [
  {
    id: "parcel",
    title: "Gửi / Nhận đồ",
    subtitle: "Tiếp nhận, bảo quản & giao tận căn",
    icon: Package,
    accentKey: "brand",
    tintKey: "tintBlue",
    items: [
      { id: "parcel-receive", icon: Package, label: "Nhận & giữ hàng hộ", desc: "Bưu phẩm, đồ ăn", requestType: "package" },
      { id: "parcel-deliver", icon: Truck, label: "Giao tận căn hộ", desc: "Bảo vệ mang hàng lên cửa", requestType: "package" },
      { id: "parcel-send", icon: Send, label: "Gửi hàng đi", desc: "Hỗ trợ gửi cho shipper", requestType: "other" },
    ],
  },
  {
    id: "reminder",
    title: "Nhắc việc",
    subtitle: "Notification định kỳ",
    icon: BellRing,
    accentKey: "brand",
    tintKey: "tintBlue",
    items: [
      { id: "rem-utility", icon: Lightbulb, label: "Nhắc tắt điện / nước", desc: "Theo khung giờ cư dân", requestType: "other" },
      { id: "rem-process", icon: ShieldCheck, label: "Bảo vệ xử lý khi quên", desc: "Kiểm tra & xác nhận", requestType: "other" },
    ],
  },
  {
    id: "care",
    title: "Hỗ trợ người lớn tuổi & trẻ em",
    subtitle: "Đồng hành an toàn",
    icon: Users,
    accentKey: "pink",
    tintKey: "tintPink",
    items: [
      { id: "care-home", icon: UserCheck, label: "Chăm sóc tại nhà", desc: "Hỗ trợ khi gia đình vắng", requestType: "other" },
      { id: "care-escort", icon: Baby, label: "Đưa đón lên / xuống", desc: "Thang máy an toàn", requestType: "other" },
    ],
  },
  {
    id: "freight",
    title: "Vận chuyển hàng hoá",
    subtitle: "Thang hàng & nhân lực",
    icon: Boxes,
    accentKey: "warning",
    tintKey: "tintOrange",
    items: [
      { id: "freight-remote", icon: Truck, label: "Chuyển hàng từ xa", desc: "Đăng ký trước", requestType: "other" },
      { id: "freight-lift", icon: Boxes, label: "Thang hàng + hỗ trợ", desc: "Bốc xếp giúp cư dân", requestType: "other" },
    ],
  },
  {
    id: "parking",
    title: "Hỗ trợ tìm & sắp xếp xe",
    subtitle: "Bãi xe gọn — lấy xe nhanh",
    icon: Car,
    accentKey: "success",
    tintKey: "tintGreen",
    items: [
      { id: "park-arrange", icon: ParkingCircle, label: "Sắp xe đúng vị trí", desc: "Điều phối chỗ đậu", requestType: "other" },
      { id: "park-find", icon: Car, label: "Tìm xe nhanh", desc: "Định vị trong bãi", requestType: "other" },
    ],
  },
  {
    id: "private",
    title: "Bảo an theo giờ",
    subtitle: "Sự kiện, đón khách VIP",
    icon: Clock,
    accentKey: "emergency",
    tintKey: "tintRed",
    items: [
      { id: "priv-hourly", icon: Clock, label: "Bảo vệ theo giờ", desc: "Đặt lịch theo khung giờ", requestType: "other" },
      { id: "priv-custom", icon: ShieldCheck, label: "Theo nhu cầu riêng", desc: "Yêu cầu đặc biệt", requestType: "other" },
    ],
  },
];

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Người lạ",
  noise: "Tiếng ồn",
  package: "Nhận hàng",
  other: "Yêu cầu khác",
};

export const REQUEST_TYPE_EMOJI: Record<string, string> = {
  sos: "🆘",
  fire: "🔥",
  intrusion: "⚠️",
  noise: "🔊",
  package: "📦",
  other: "📞",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: "Đã gửi · chờ điều phối",
  in_progress: "Bảo an đang xử lý",
  resolved: "Đã giải quyết",
  cancelled: "Đã huỷ",
};
