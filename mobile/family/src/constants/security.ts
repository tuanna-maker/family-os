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
import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getStrings } from "@mobile/i18n/useI18n";

export const securityMeta = {
  responseTimeMinutes: 2,
  hotline: "1900 6868",
};

export type SecurityGridItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  requestType: "sos" | "fire" | "intrusion" | "noise" | "package" | "other";
  iconColorKey: "warning" | "emergency" | "brand" | "success" | "pink";
  tintKey: "tintOrange" | "tintRed" | "tintBlue" | "tintGreen" | "tintPink";
  action: "trigger" | "call" | "chat" | "navigate";
  route?: string;
};

export function getBuildingStatus(locale: AppLocale) {
  const rows = getStrings(locale).security.building;
  return rows.map((r) => ({ ...r, ok: true }));
}

export function getSecurityServiceGrid(locale: AppLocale): SecurityGridItem[] {
  const g = getStrings(locale).security.grid;
  return [
    {
      id: "fire",
      icon: Flame,
      label: g.fire.label,
      desc: g.fire.desc,
      requestType: "fire",
      iconColorKey: "warning",
      tintKey: "tintOrange",
      action: "trigger",
    },
    {
      id: "stranger",
      icon: AlertTriangle,
      label: g.stranger.label,
      desc: g.stranger.desc,
      requestType: "intrusion",
      iconColorKey: "emergency",
      tintKey: "tintRed",
      action: "trigger",
    },
    {
      id: "package",
      icon: Package,
      label: g.package.label,
      desc: g.package.desc,
      requestType: "package",
      iconColorKey: "brand",
      tintKey: "tintBlue",
      action: "navigate",
      route: "/bao-an/nhan-hang-ho",
    },
    {
      id: "shipping",
      icon: Send,
      label: g.shipping.label,
      desc: g.shipping.desc,
      requestType: "other",
      iconColorKey: "success",
      tintKey: "tintGreen",
      action: "navigate",
      route: "/bao-an/gui-hang-di",
    },
    {
      id: "tech",
      icon: Wrench,
      label: g.tech.label,
      desc: g.tech.desc,
      requestType: "other",
      iconColorKey: "brand",
      tintKey: "tintBlue",
      action: "trigger",
    },
    {
      id: "call",
      icon: Phone,
      label: g.call.label,
      desc: g.call.desc(securityMeta.hotline),
      requestType: "other",
      iconColorKey: "success",
      tintKey: "tintGreen",
      action: "call",
    },
    {
      id: "chat",
      icon: MessageCircle,
      label: g.chat.label,
      desc: g.chat.desc,
      requestType: "other",
      iconColorKey: "pink",
      tintKey: "tintPink",
      action: "chat",
    },
  ];
}

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

export function getSecurityServiceCatalog(locale: AppLocale): SecurityCatalogGroup[] {
  const c = getStrings(locale).security.catalog;
  return [
    {
      id: "parcel",
      title: c.parcel.title,
      subtitle: c.parcel.subtitle,
      icon: Package,
      accentKey: "brand",
      tintKey: "tintBlue",
      items: [
        { id: "parcel-receive", icon: Package, label: c.parcel.items.receive.label, desc: c.parcel.items.receive.desc, requestType: "package" },
        { id: "parcel-deliver", icon: Truck, label: c.parcel.items.deliver.label, desc: c.parcel.items.deliver.desc, requestType: "package" },
        { id: "parcel-send", icon: Send, label: c.parcel.items.send.label, desc: c.parcel.items.send.desc, requestType: "other" },
      ],
    },
    {
      id: "reminder",
      title: c.reminder.title,
      subtitle: c.reminder.subtitle,
      icon: BellRing,
      accentKey: "brand",
      tintKey: "tintBlue",
      items: [
        { id: "rem-utility", icon: Lightbulb, label: c.reminder.items.utility.label, desc: c.reminder.items.utility.desc, requestType: "other" },
        { id: "rem-process", icon: ShieldCheck, label: c.reminder.items.process.label, desc: c.reminder.items.process.desc, requestType: "other" },
      ],
    },
    {
      id: "care",
      title: c.care.title,
      subtitle: c.care.subtitle,
      icon: Users,
      accentKey: "pink",
      tintKey: "tintPink",
      items: [
        { id: "care-home", icon: UserCheck, label: c.care.items.home.label, desc: c.care.items.home.desc, requestType: "other" },
        { id: "care-escort", icon: Baby, label: c.care.items.escort.label, desc: c.care.items.escort.desc, requestType: "other" },
      ],
    },
    {
      id: "freight",
      title: c.freight.title,
      subtitle: c.freight.subtitle,
      icon: Boxes,
      accentKey: "warning",
      tintKey: "tintOrange",
      items: [
        { id: "freight-remote", icon: Truck, label: c.freight.items.remote.label, desc: c.freight.items.remote.desc, requestType: "other" },
        { id: "freight-lift", icon: Boxes, label: c.freight.items.lift.label, desc: c.freight.items.lift.desc, requestType: "other" },
      ],
    },
    {
      id: "parking",
      title: c.parking.title,
      subtitle: c.parking.subtitle,
      icon: Car,
      accentKey: "success",
      tintKey: "tintGreen",
      items: [
        { id: "park-arrange", icon: ParkingCircle, label: c.parking.items.arrange.label, desc: c.parking.items.arrange.desc, requestType: "other" },
        { id: "park-find", icon: Car, label: c.parking.items.find.label, desc: c.parking.items.find.desc, requestType: "other" },
      ],
    },
    {
      id: "private",
      title: c.private.title,
      subtitle: c.private.subtitle,
      icon: Clock,
      accentKey: "emergency",
      tintKey: "tintRed",
      items: [
        { id: "priv-hourly", icon: Clock, label: c.private.items.hourly.label, desc: c.private.items.hourly.desc, requestType: "other" },
        { id: "priv-custom", icon: ShieldCheck, label: c.private.items.custom.label, desc: c.private.items.custom.desc, requestType: "other" },
      ],
    },
  ];
}

export const REQUEST_TYPE_EMOJI: Record<string, string> = {
  sos: "🆘",
  fire: "🔥",
  intrusion: "⚠️",
  noise: "🔊",
  package: "📦",
  other: "📞",
};

export function getRequestTypeLabel(type: string, locale: AppLocale): string {
  const labels = getStrings(locale).security.requestType;
  return labels[type as keyof typeof labels] ?? type;
}

export function getRequestStatusLabel(status: string, locale: AppLocale): string {
  const labels = getStrings(locale).security.requestStatus;
  return labels[status as keyof typeof labels] ?? status;
}
