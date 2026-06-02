import type { ComponentType } from "react";
import type { Role } from "@/types/core";
import {
  LayoutDashboard, Building, Building2, Home as HomeIcon, Users2, ClipboardList,
  AlertTriangle, Receipt, CreditCard, Car, ShieldCheck, BarChart3, UserCog,
  Wrench, Settings, Package, Wallet, Sparkles, Activity, ShieldAlert, Flag,
  Shield, UsersRound, Megaphone,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  roles: Role[];
  phase?: "MVP" | "Phase 2" | "Phase 3";
}

// SaaS Admin
export const SAAS_NAV: NavItem[] = [
  { label: "Tổng quan", to: "/saas", icon: LayoutDashboard, exact: true, roles: ["super_admin", "tenant_admin"] },
  { label: "Tenants", to: "/saas/tenants", icon: Building, roles: ["super_admin"] },
  { label: "Dự án", to: "/saas/projects", icon: Building2, roles: ["super_admin", "tenant_admin"] },
  { label: "Gói dịch vụ", to: "/saas/plans", icon: Package, roles: ["super_admin"], phase: "Phase 2" },
  { label: "Doanh thu", to: "/saas/billing", icon: Wallet, roles: ["super_admin"], phase: "Phase 2" },
  { label: "Người dùng", to: "/saas/users", icon: Users2, roles: ["super_admin"] },
  { label: "Leads & demo", to: "/saas/leads", icon: Sparkles, roles: ["super_admin"] },
  { label: "Audit log", to: "/saas/audit", icon: Activity, roles: ["super_admin", "tenant_admin"] },
  { label: "Sự cố hệ thống", to: "/saas/incidents", icon: ShieldAlert, roles: ["super_admin"] },
  { label: "Giám sát hệ thống", to: "/saas/observability", icon: Activity, roles: ["super_admin", "tenant_admin"] },
  { label: "SOC liên dự án", to: "/saas/security-ops", icon: ShieldCheck, roles: ["super_admin", "tenant_admin"] },
  { label: "Bảo vệ toàn hệ thống", to: "/saas/guards", icon: UserCog, roles: ["super_admin", "tenant_admin"] },
  { label: "Hộ gia đình", to: "/saas/families", icon: UsersRound, roles: ["super_admin", "tenant_admin"] },
  { label: "Roles & quyền", to: "/admin/roles", icon: Shield, roles: ["super_admin", "tenant_admin"] },
  { label: "Feature flags", to: "/saas/feature-flags", icon: Flag, roles: ["super_admin"], phase: "Phase 3" },
  { label: "Cài đặt", to: "/saas/cai-dat", icon: Settings, roles: ["super_admin"] },
];

// BQL Portal
const BQL_VIEWERS: Role[] = ["super_admin", "tenant_admin", "bql_manager", "bql_staff"];
const BQL_OPS: Role[] = ["super_admin", "tenant_admin", "bql_manager", "bql_staff", "security_guard"];
const BQL_BILLING: Role[] = ["super_admin", "tenant_admin", "bql_manager"];

export const BQL_NAV: NavItem[] = [
  { label: "Tổng quan", to: "/bql", icon: LayoutDashboard, exact: true, roles: BQL_VIEWERS },
  { label: "Dự án", to: "/bql/du-an", icon: Building, roles: BQL_VIEWERS },
  { label: "Toà nhà", to: "/bql/toa-nha", icon: Building2, roles: BQL_VIEWERS },
  { label: "Căn hộ", to: "/bql/can-ho", icon: HomeIcon, roles: BQL_VIEWERS },
  { label: "Cư dân", to: "/bql/cu-dan", icon: Users2, roles: BQL_VIEWERS },
  { label: "Hộ gia đình", to: "/bql/ho-gia-dinh", icon: UsersRound, roles: BQL_VIEWERS },
  { label: "Nhân sự", to: "/bql/nhan-su", icon: UserCog, roles: BQL_BILLING },
  { label: "Phản ánh", to: "/bql/phan-anh", icon: ClipboardList, roles: BQL_OPS },
  { label: "Khách & xe", to: "/bql/khach-xe", icon: Car, roles: BQL_OPS },
  { label: "Thông báo", to: "/bql/thong-bao", icon: Megaphone, roles: BQL_VIEWERS },
  { label: "Phí dịch vụ", to: "/bql/phi-dich-vu", icon: Receipt, roles: BQL_BILLING },
  { label: "Thanh toán", to: "/bql/thanh-toan", icon: CreditCard, roles: BQL_BILLING },
  { label: "Sự cố", to: "/bql/su-co", icon: AlertTriangle, roles: BQL_OPS, phase: "Phase 2" },
  { label: "An ninh", to: "/bql/an-ninh", icon: ShieldCheck, roles: BQL_OPS, phase: "Phase 2" },
  { label: "Báo cáo", to: "/bql/bao-cao", icon: BarChart3, roles: BQL_BILLING, phase: "Phase 2" },
  { label: "Bảo trì", to: "/bql/bao-tri", icon: Wrench, roles: BQL_VIEWERS, phase: "Phase 3" },
  { label: "Cài đặt", to: "/bql/cai-dat", icon: Settings, roles: BQL_BILLING },
];

export function filterNavByRole(items: NavItem[], role: Role | null | undefined): NavItem[] {
  if (!role) return [];
  return items.filter((it) => it.roles.includes(role));
}
