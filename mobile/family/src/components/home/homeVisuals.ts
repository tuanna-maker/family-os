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
import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import type { AppColors } from "@mobile/theme/palettes";
import type { FamilyTodayMember, StatusTone } from "@mobile/api/family-today";
import type { SecurityChip, SecurityTone } from "@mobile/api/security";
import { formatActivityTime as fmtActivityTime } from "@mobile/i18n/format";
import { getStrings } from "@mobile/i18n/useI18n";

export const SECURITY_HERO = require("../../../assets/security-hero.jpg");

export function getHomeServices(locale: AppLocale) {
  const s = getStrings(locale).home.services;
  return [
    { id: "sos", label: s.sos.label, sub: s.sos.sub, Icon: ShieldCheck, colorKey: "emergency" as const, bgKey: "tintRed" as const, href: "/(tabs)/bao-an" as const },
    { id: "fire", label: s.fire.label, sub: s.fire.sub, Icon: Flame, colorKey: "warning" as const, bgKey: "tintOrange" as const, href: "/(tabs)/bao-an" as const },
    { id: "package", label: s.package.label, sub: s.package.sub, Icon: Package, colorKey: "brand" as const, bgKey: "tintBlue" as const, href: "/(tabs)/bao-an" as const },
    { id: "stranger", label: s.stranger.label, sub: s.stranger.sub, Icon: UserX, colorKey: "pink" as const, bgKey: "tintPurple" as const, href: "/(tabs)/bao-an" as const },
    { id: "tech", label: s.tech.label, sub: s.tech.sub, Icon: Wrench, colorKey: "brand" as const, bgKey: "tintBlue" as const, href: "/(tabs)/bao-an" as const },
    { id: "more", label: s.more.label, sub: s.more.sub, Icon: MoreHorizontal, colorKey: "muted" as const, bgKey: "mutedBg" as const, href: "/(tabs)/bao-an" as const },
  ] as const;
}

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

export function getKindMeta(locale: AppLocale) {
  const k = getStrings(locale).home.kind;
  return {
    elderly: { Icon: Heart, bgKey: "tintPink" as const, colorKey: "pink" as const, label: k.elderly },
    child: { Icon: GraduationCap, bgKey: "tintBlue" as const, colorKey: "brand" as const, label: k.child },
    adult: { Icon: UserCheck, bgKey: "tintPurple" as const, colorKey: "pink" as const, label: k.adult },
  } satisfies Record<
    FamilyTodayMember["kind"],
    { Icon: LucideIcon; bgKey: keyof AppColors; colorKey: keyof AppColors; label: string }
  >;
}

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

export function formatActivityTime(iso: string, locale: AppLocale): string {
  return fmtActivityTime(iso, locale);
}

export function colorFromKey(colors: AppColors, key: keyof AppColors): string {
  return colors[key] as string;
}

export function getDefaultSecurityChips(locale: AppLocale): SecurityChip[] {
  const d = getStrings(locale).home.defaultChips;
  return [
    { key: "camera", label: d.camera, value: "—", tone: "muted", count: 0 },
    { key: "fire", label: d.fire, value: "—", tone: "muted", count: 0 },
    { key: "elevator", label: d.elevator, value: "—", tone: "muted", count: 0 },
  ];
}
