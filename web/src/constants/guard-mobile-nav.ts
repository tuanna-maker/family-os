import type { ComponentType } from "react";
import {
  LayoutDashboard,
  MapPin,
  ScanLine,
  ClipboardList,
  User,
  type LucideIcon,
} from "lucide-react";

export type GuardTabId = "duty" | "patrol" | "scan" | "tasks" | "me";

export interface GuardTabDef {
  id: GuardTabId;
  to: string;
  label: string;
  icon: LucideIcon;
  /** Prefixes for active state (sub-routes) */
  matchPrefixes: readonly string[];
  /** Center elevated action (QR scan) */
  prominent?: boolean;
}

/**
 * STOS Guard — primary navigation (Apple HIG: ≤5 tabs, labels under icons).
 * Field-ops order: Ca trực → Tuần tra → Quét (center) → Nhiệm vụ → Tài khoản.
 */
export const GUARD_TABS: readonly GuardTabDef[] = [
  {
    id: "duty",
    to: "/guard",
    label: "Ca trực",
    icon: LayoutDashboard,
    matchPrefixes: ["/guard"],
  },
  {
    id: "patrol",
    to: "/guard/patrol",
    label: "Tuần tra",
    icon: MapPin,
    matchPrefixes: ["/guard/patrol"],
  },
  {
    id: "scan",
    to: "/guard/scan",
    label: "Quét",
    icon: ScanLine,
    matchPrefixes: ["/guard/scan"],
    prominent: true,
  },
  {
    id: "tasks",
    to: "/guard/tasks",
    label: "Nhiệm vụ",
    icon: ClipboardList,
    matchPrefixes: ["/guard/tasks"],
  },
  {
    id: "me",
    to: "/guard/me",
    label: "Tài khoản",
    icon: User,
    matchPrefixes: ["/guard/me"],
  },
] as const;

export function isGuardTabActive(tab: GuardTabDef, pathname: string): boolean {
  if (tab.id === "duty") {
    return pathname === "/guard" || pathname === "/guard/";
  }
  return tab.matchPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
