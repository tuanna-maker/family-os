import type { ComponentType } from "react";
import type { Role } from "@/types/core";
import {
  LayoutDashboard, Building, Building2, Package, Wallet, Activity, Cpu, Plug,
  ShieldCheck, FileText, BarChart3, Users2, Home as HomeIcon, ClipboardList,
  AlertTriangle, Car, Receipt, CreditCard, Megaphone, UserCog, Wrench, Settings,
  Shield, ScanLine, Siren, Eye, Radio, Bell, MapPin, HeartPulse, Sparkles,
  Calendar, Baby, Apple, KeyRound, Globe, Database, Layers, GitBranch, ListTree,
  ServerCog, Lock,
} from "lucide-react";

export interface ConsoleNavItem {
  label: string;
  to?: string;
  icon: ComponentType<{ className?: string }>;
  roles: Role[];
  badge?: "Mới" | "Sắp có" | "Beta";
  external?: boolean;
}

export interface ConsoleNavGroup {
  label: string;
  items: ConsoleNavItem[];
}

// ============================================================
// A. PLATFORM CONSOLE — Super Admin, Platform Ops, Billing, Support, Auditor
// ============================================================
const PLATFORM_ROLES: Role[] = [
  "super_admin", "platform_ops", "billing_admin", "support", "auditor", "tenant_admin",
];

export const PLATFORM_NAV: ConsoleNavGroup[] = [
  {
    label: "Quản trị nền tảng",
    items: [
      { label: "Tổng quan nền tảng", to: "/console", icon: LayoutDashboard, roles: PLATFORM_ROLES },
      { label: "Quản lý tenant", to: "/saas/tenants", icon: Building, roles: ["super_admin", "platform_ops"], external: true },
      { label: "Quản lý dự án", to: "/saas/projects", icon: Building2, roles: PLATFORM_ROLES, external: true },
      { label: "Gói dịch vụ & Đăng ký", to: "/saas/plans", icon: Package, roles: ["super_admin", "billing_admin"], external: true, badge: "Sắp có" },
      { label: "Thanh toán & Hoá đơn", to: "/saas/billing", icon: Wallet, roles: ["super_admin", "billing_admin"], external: true, badge: "Sắp có" },
      { label: "Giám sát sử dụng", icon: BarChart3, roles: ["super_admin", "platform_ops"], badge: "Sắp có" },
      { label: "Cấu hình hệ thống", icon: Cpu, roles: ["super_admin"], badge: "Sắp có" },
      { label: "Tính năng & Module", to: "/saas/feature-flags", icon: Sparkles, roles: ["super_admin"], external: true, badge: "Beta" },
      { label: "Tích hợp hệ thống", icon: Plug, roles: ["super_admin", "platform_ops"], badge: "Sắp có" },
    ],
  },
  {
    label: "Quan sát & tuân thủ",
    items: [
      { label: "Nhật ký hoạt động", to: "/saas/audit", icon: Activity, roles: [...PLATFORM_ROLES, "auditor"], external: true },
      { label: "Audit Logs", icon: ListTree, roles: ["super_admin", "auditor"], badge: "Sắp có" },
      { label: "System Health", icon: ServerCog, roles: ["super_admin", "platform_ops"], badge: "Sắp có" },
      { label: "Security Center", icon: Lock, roles: ["super_admin", "auditor"], badge: "Sắp có" },
      { label: "Data Governance", icon: Database, roles: ["super_admin", "auditor"], badge: "Sắp có" },
    ],
  },
  {
    label: "Mở rộng",
    items: [
      { label: "Branding / White-label", icon: Globe, roles: ["super_admin"], badge: "Sắp có" },
      { label: "API & Webhook", icon: GitBranch, roles: ["super_admin", "platform_ops"], badge: "Sắp có" },
      { label: "Marketplace", icon: Layers, roles: ["super_admin"], badge: "Sắp có" },
    ],
  },
];

// ============================================================
// B. COMMUNITY OPERATIONS
// ============================================================
const OPS_ROLES: Role[] = [
  "super_admin", "tenant_admin", "bql_manager", "bql_staff",
  "receptionist", "ops_staff", "tech_staff", "finance_staff",
];

export const OPS_NAV: ConsoleNavGroup[] = [
  {
    label: "Vận hành cộng đồng",
    items: [
      { label: "Tổng quan vận hành", to: "/ops", icon: LayoutDashboard, roles: OPS_ROLES },
      { label: "Quản lý cư dân", to: "/bql/cu-dan", icon: Users2, roles: OPS_ROLES, external: true },
      { label: "Toà nhà & Căn hộ", to: "/bql/toa-nha", icon: HomeIcon, roles: OPS_ROLES, external: true },
      { label: "Khách ra vào", to: "/bql/khach-xe", icon: Car, roles: OPS_ROLES, external: true },
      { label: "Yêu cầu dịch vụ", to: "/bql/yeu-cau", icon: ClipboardList, roles: OPS_ROLES, external: true },
      { label: "Quản lý sự cố", to: "/bql/su-co", icon: AlertTriangle, roles: OPS_ROLES, external: true },
      { label: "Tiện ích & Đặt chỗ", icon: Calendar, roles: OPS_ROLES, badge: "Sắp có" },
      { label: "Thu phí & Công nợ", to: "/bql/phi-dich-vu", icon: Receipt, roles: ["super_admin", "tenant_admin", "bql_manager", "finance_staff"], external: true },
      { label: "Thanh toán", to: "/bql/thanh-toan", icon: CreditCard, roles: ["super_admin", "tenant_admin", "bql_manager", "finance_staff"], external: true },
      { label: "Nhân sự & Nhà thầu", to: "/bql/nhan-su", icon: UserCog, roles: ["super_admin", "tenant_admin", "bql_manager"], external: true },
      { label: "Thông báo & Truyền thông", to: "/bql/thong-bao", icon: Megaphone, roles: OPS_ROLES, external: true },
      { label: "Báo cáo vận hành", to: "/bql/bao-cao", icon: BarChart3, roles: ["super_admin", "tenant_admin", "bql_manager"], external: true },
      { label: "SLA & KPI", icon: BarChart3, roles: ["super_admin", "tenant_admin", "bql_manager"], badge: "Sắp có" },
    ],
  },
];

// ============================================================
// C. SECURITY OPERATIONS
// ============================================================
const SEC_ROLES: Role[] = [
  "super_admin", "tenant_admin",
  "security_director", "security_supervisor", "guard_captain", "security_guard", "patrol",
];

export const SECURITY_NAV: ConsoleNavGroup[] = [
  {
    label: "Trung tâm an ninh",
    items: [
      { label: "Tổng quan an ninh", to: "/security", icon: Shield, roles: SEC_ROLES },
      { label: "Lực lượng bảo vệ", icon: ShieldCheck, roles: SEC_ROLES, badge: "Mới" },
      { label: "Ca trực & Lịch", icon: Calendar, roles: SEC_ROLES, badge: "Sắp có" },
      { label: "Tuần tra & Checkpoint", icon: MapPin, roles: SEC_ROLES, badge: "Sắp có" },
      { label: "Kiểm soát ra vào (QR/NFC)", icon: ScanLine, roles: SEC_ROLES, badge: "Sắp có" },
      { label: "Nhật ký ra vào", icon: FileText, roles: SEC_ROLES, badge: "Sắp có" },
    ],
  },
  {
    label: "Phản ứng sự cố",
    items: [
      { label: "Trung tâm sự cố", to: "/bql/an-ninh", icon: Siren, roles: SEC_ROLES, external: true },
      { label: "Báo động khẩn cấp", icon: Bell, roles: SEC_ROLES, badge: "Sắp có" },
      { label: "Danh sách theo dõi", icon: Eye, roles: SEC_ROLES, badge: "Sắp có" },
      { label: "Thiết bị an ninh", icon: Radio, roles: SEC_ROLES, badge: "Sắp có" },
      { label: "Báo cáo an ninh", icon: BarChart3, roles: ["super_admin", "tenant_admin", "security_director"], badge: "Sắp có" },
    ],
  },
];

// ============================================================
// D. RESIDENT SERVICES (mobile-first, end-user)
// ============================================================
const RES_ROLES: Role[] = ["resident", "head_of_household", "household_member", "helper"];

export const RESIDENT_NAV: ConsoleNavGroup[] = [
  {
    label: "Cư dân",
    items: [
      { label: "Trang chủ", to: "/app", icon: HomeIcon, roles: RES_ROLES },
      { label: "Căn hộ của tôi", to: "/portal", icon: HomeIcon, roles: RES_ROLES, external: true },
      { label: "QR khách ra vào", to: "/qr-vao-ra", icon: ScanLine, roles: RES_ROLES, external: true },
      { label: "Yêu cầu dịch vụ", to: "/dich-vu", icon: ClipboardList, roles: RES_ROLES, external: true },
      { label: "Thanh toán", icon: CreditCard, roles: RES_ROLES, badge: "Sắp có" },
      { label: "Tiện ích & Đặt chỗ", icon: Calendar, roles: RES_ROLES, badge: "Sắp có" },
      { label: "Thông báo", to: "/thong-bao", icon: Bell, roles: RES_ROLES, external: true },
      { label: "Nhật ký ra vào", icon: FileText, roles: RES_ROLES, badge: "Sắp có" },
      { label: "Hồ sơ cá nhân", to: "/tai-khoan", icon: UserCog, roles: RES_ROLES, external: true },
    ],
  },
];

// ============================================================
// E. FAMILY CORE (governance, multi-household)
// ============================================================
const FAMILY_GOV_ROLES: Role[] = ["super_admin", "tenant_admin", "bql_manager"];

export const FAMILY_NAV: ConsoleNavGroup[] = [
  {
    label: "Family Core",
    items: [
      { label: "Tổng quan Family Core", to: "/family", icon: HeartPulse, roles: FAMILY_GOV_ROLES },
      { label: "Danh sách hộ gia đình", to: "/bql/ho-gia-dinh", icon: Users2, roles: FAMILY_GOV_ROLES, external: true },
      { label: "Người cao tuổi", to: "/admin/elderly-care", icon: HeartPulse, roles: FAMILY_GOV_ROLES, external: true },
      { label: "Người giúp việc", to: "/admin/helpers", icon: Users2, roles: FAMILY_GOV_ROLES, external: true },
      { label: "Lịch & Nhắc việc", to: "/admin/calendar", icon: Calendar, roles: FAMILY_GOV_ROLES, external: true },
      { label: "Kỷ niệm & Lưu trữ", to: "/admin/memories", icon: Apple, roles: FAMILY_GOV_ROLES, external: true },
      { label: "SOS gia đình", icon: Siren, roles: FAMILY_GOV_ROLES, badge: "Sắp có" },
    ],
  },
  {
    label: "Quản trị Family Core",
    items: [
      { label: "Quota & Usage", icon: BarChart3, roles: FAMILY_GOV_ROLES, badge: "Sắp có" },
      { label: "Privacy & Consent", icon: Lock, roles: FAMILY_GOV_ROLES, badge: "Sắp có" },
      { label: "Audit Logs Family Core", icon: Activity, roles: FAMILY_GOV_ROLES, badge: "Sắp có" },
      { label: "Module Family Core", icon: Package, roles: ["super_admin"], badge: "Sắp có" },
    ],
  },
];

// Backwards-compat alias for existing imports
export const CONSOLE_NAV = PLATFORM_NAV;

export function filterConsoleNav(
  groups: ConsoleNavGroup[],
  role: Role | null | undefined,
): ConsoleNavGroup[] {
  if (!role) return [];
  return groups
    .map((g) => ({ ...g, items: g.items.filter((it) => it.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}
