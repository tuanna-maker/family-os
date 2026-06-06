import type { LucideIcon } from "lucide-react-native";
import {
  ShieldCheck,
  Flame,
  Package,
  UserX,
  Wrench,
  MoreHorizontal,
  Camera,
  Building2,
  Heart,
  GraduationCap,
  UserCheck,
  Calendar,
  Receipt,
  Pill,
  ShoppingBasket,
  Truck,
  FileText,
  Bell,
  AlertTriangle,
  Users,
} from "lucide-react-native";
import type { AppColors } from "@mobile/theme/palettes";
import type { FamilyTodayMember, StatusTone } from "@mobile/api/family-today";
import type { SecurityChip, SecurityTone } from "@mobile/api/security";

export const SECURITY_HERO = require("../../../assets/security-hero.jpg");

export const SERVICES = [
  { id: "sos", label: "SOS", sub: "khẩn cấp", Icon: ShieldCheck, colorKey: "emergency" as const, bgKey: "tintRed" as const, href: "/(tabs)/bao-an" as const },
  { id: "fire", label: "Báo cháy", sub: "", Icon: Flame, colorKey: "warning" as const, bgKey: "tintOrange" as const, href: "/(tabs)/bao-an" as const },
  { id: "package", label: "Nhận hàng", sub: "giúp", Icon: Package, colorKey: "brand" as const, bgKey: "tintBlue" as const, href: "/(tabs)/bao-an" as const },
  { id: "stranger", label: "Báo người", sub: "lạ", Icon: UserX, colorKey: "pink" as const, bgKey: "tintPurple" as const, href: "/(tabs)/bao-an" as const },
  { id: "tech", label: "Hỗ trợ", sub: "kỹ thuật", Icon: Wrench, colorKey: "brand" as const, bgKey: "tintBlue" as const, href: "/(tabs)/bao-an" as const },
  { id: "more", label: "Xem thêm", sub: "", Icon: MoreHorizontal, colorKey: "muted" as const, bgKey: "mutedBg" as const, href: "/(tabs)/bao-an" as const },
] as const;

export const SECURITY_CHIP_ICONS: Record<SecurityChip["key"], LucideIcon> = {
  camera: Camera,
  fire: Flame,
  elevator: Building2,
  intrusion: UserX,
  package: Package,
  tech: Wrench,
};

export function securityToneStyle(colors: AppColors, tone: SecurityTone) {
  switch (tone) {
    case "success":
      return { chip: colors.tintGreen, text: colors.success, dot: colors.success, headline: colors.success };
    case "warning":
      return { chip: colors.tintOrange, text: colors.warning, dot: colors.warning, headline: colors.warning };
    case "emergency":
      return { chip: colors.tintRed, text: colors.emergency, dot: colors.emergency, headline: colors.emergency };
    default:
      return { chip: colors.mutedBg, text: colors.muted, dot: colors.muted, headline: colors.muted };
  }
}

export function statusToneStyle(colors: AppColors, tone: StatusTone) {
  switch (tone) {
    case "success":
      return { dot: colors.success, chip: colors.tintGreen, text: colors.success };
    case "warning":
      return { dot: colors.warning, chip: colors.tintOrange, text: colors.warning };
    case "info":
      return { dot: colors.brand, chip: colors.tintBlue, text: colors.brand };
    case "emergency":
      return { dot: colors.emergency, chip: colors.tintRed, text: colors.emergency };
    default:
      return { dot: colors.muted, chip: colors.mutedBg, text: colors.muted };
  }
}

export const kindMeta: Record<
  FamilyTodayMember["kind"],
  { Icon: LucideIcon; bgKey: keyof AppColors; colorKey: keyof AppColors; label: string }
> = {
  elderly: { Icon: Heart, bgKey: "tintPink", colorKey: "pink", label: "Ông/Bà" },
  child: { Icon: GraduationCap, bgKey: "tintBlue", colorKey: "brand", label: "Con" },
  adult: { Icon: UserCheck, bgKey: "tintPurple", colorKey: "pink", label: "Bố/Mẹ" },
};

const activityVisuals: Record<string, { Icon: LucideIcon; colorKey: keyof AppColors; bgKey: keyof AppColors }> = {
  medicine: { Icon: Pill, colorKey: "emergency", bgKey: "tintRed" },
  health: { Icon: Heart, colorKey: "pink", bgKey: "tintPink" },
  calendar: { Icon: Calendar, colorKey: "brand", bgKey: "tintBlue" },
  event: { Icon: Calendar, colorKey: "brand", bgKey: "tintBlue" },
  expense: { Icon: Receipt, colorKey: "warning", bgKey: "tintOrange" },
  bill: { Icon: FileText, colorKey: "emergency", bgKey: "tintRed" },
  food: { Icon: ShoppingBasket, colorKey: "success", bgKey: "tintGreen" },
  delivery: { Icon: Truck, colorKey: "success", bgKey: "tintGreen" },
  security: { Icon: ShieldCheck, colorKey: "emergency", bgKey: "tintRed" },
  alert: { Icon: AlertTriangle, colorKey: "warning", bgKey: "tintOrange" },
  tech: { Icon: Wrench, colorKey: "brand", bgKey: "tintBlue" },
  family: { Icon: Users, colorKey: "brand", bgKey: "tintBlue" },
};

export function getActivityVisual(type: string) {
  return (
    activityVisuals[type] ?? {
      Icon: Bell,
      colorKey: "muted" as const,
      bgKey: "mutedBg" as const,
    }
  );
}

export function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  const hhmm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return hhmm;
  if (isYesterday) return `Hôm qua ${hhmm}`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function colorFromKey(colors: AppColors, key: keyof AppColors): string {
  return colors[key] as string;
}
