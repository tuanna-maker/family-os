import type { Permission, Role, RoleDefinition } from "@/types/core";

const ALL_PERMISSIONS: Permission[] = [
  "tenant.view", "tenant.create", "tenant.edit", "tenant.delete",
  "project.view", "project.create", "project.edit", "project.delete",
  "building.view", "building.create", "building.edit", "building.delete",
  "apartment.view", "apartment.create", "apartment.edit", "apartment.delete",
  "resident.view", "resident.create", "resident.edit", "resident.delete", "resident.approve",
  "staff.view", "staff.create", "staff.edit", "staff.delete",
  "family.view", "family.create", "family.edit", "family.delete",
  "service_request.view", "service_request.create", "service_request.assign", "service_request.resolve",
  "incident.view", "incident.resolve",
  "visitor.view", "visitor.create", "visitor.approve", "visitor.scan",
  "announcement.view", "announcement.create", "announcement.send",
  "fee.view", "fee.create", "fee.edit",
  "payment.view", "payment.create",
  "role.view", "role.assign",
  "audit.view",
  "billing.view", "billing.collect",
];

export const ROLES: Record<Role, RoleDefinition> = {
  super_admin: {
    id: "super_admin",
    name: "Super Admin",
    description: "Toàn quyền nền tảng STOS, vượt qua mọi RLS.",
    scope: "platform",
    permissions: ALL_PERMISSIONS,
  },
  tenant_admin: {
    id: "tenant_admin",
    name: "Tenant Admin",
    description: "Quản trị toàn bộ dự án trong tenant.",
    scope: "tenant",
    permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith("tenant.")),
  },
  bql_manager: {
    id: "bql_manager",
    name: "BQL Manager",
    description: "Trưởng ban quản lý dự án — phê duyệt & giao việc.",
    scope: "project",
    permissions: [
      "project.view", "project.edit",
      "building.view", "building.edit",
      "apartment.view", "apartment.edit",
      "resident.view", "resident.create", "resident.edit", "resident.approve",
      "family.view", "family.edit",
      "staff.view", "staff.create", "staff.edit",
      "service_request.view", "service_request.assign", "service_request.resolve",
      "incident.view", "incident.resolve",
      "visitor.view", "visitor.approve", "visitor.scan",
      "announcement.view", "announcement.create", "announcement.send",
      "fee.view", "fee.create", "fee.edit",
      "payment.view", "payment.create",
      "audit.view", "billing.view", "billing.collect",
    ],
  },
  bql_staff: {
    id: "bql_staff",
    name: "BQL Staff",
    description: "Nhân viên BQL — tiếp nhận & xử lý yêu cầu.",
    scope: "project",
    permissions: [
      "project.view", "building.view", "apartment.view",
      "resident.view", "resident.edit",
      "family.view",
      "staff.view",
      "service_request.view", "service_request.resolve",
      "incident.view",
      "visitor.view", "visitor.approve",
      "announcement.view", "announcement.create",
      "fee.view", "payment.view", "payment.create",
    ],
  },
  security_guard: {
    id: "security_guard",
    name: "Security Guard",
    description: "Bảo vệ — kiểm soát ra vào, xử lý sự cố an ninh.",
    scope: "project",
    permissions: [
      "apartment.view", "resident.view",
      "incident.view", "incident.resolve",
      "visitor.view", "visitor.approve", "visitor.scan",
      "announcement.view",
    ],
  },
  head_of_household: {
    id: "head_of_household",
    name: "Chủ hộ",
    description: "Chủ căn hộ — quản lý thành viên gia đình.",
    scope: "apartment",
    permissions: [
      "apartment.view",
      "resident.view", "resident.create", "resident.edit",
      "family.view", "family.create", "family.edit", "family.delete",
      "service_request.view", "service_request.create",
      "visitor.view", "visitor.create",
      "announcement.view",
      "fee.view", "payment.view",
    ],
  },
  resident: {
    id: "resident",
    name: "Cư dân",
    description: "Thành viên trong căn hộ — chỉ xem & gửi yêu cầu.",
    scope: "apartment",
    permissions: [
      "apartment.view", "resident.view",
      "family.view",
      "service_request.view", "service_request.create",
      "visitor.view", "visitor.create",
      "announcement.view",
      "fee.view",
    ],
  },
  // --- Platform Console extras ---
  platform_ops: {
    id: "platform_ops", name: "Platform Operator", scope: "platform",
    description: "Vận hành nền tảng SaaS, không có quyền billing.",
    permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith("billing.") && !p.startsWith("tenant.delete")),
  },
  billing_admin: {
    id: "billing_admin", name: "Billing Admin", scope: "platform",
    description: "Quản trị thanh toán & hoá đơn nền tảng.",
    permissions: ["tenant.view", "billing.view", "billing.collect", "audit.view"],
  },
  support: {
    id: "support", name: "Customer Support", scope: "platform",
    description: "Hỗ trợ khách hàng — read-only.",
    permissions: ["tenant.view", "project.view", "resident.view", "service_request.view", "incident.view", "audit.view"],
  },
  auditor: {
    id: "auditor", name: "Security Auditor", scope: "platform",
    description: "Kiểm toán bảo mật & tuân thủ.",
    permissions: ["tenant.view", "project.view", "audit.view", "role.view"],
  },
  // --- Community Operations extras ---
  receptionist: {
    id: "receptionist", name: "Lễ tân", scope: "project",
    description: "Tiếp nhận khách & xử lý yêu cầu tại quầy.",
    permissions: ["apartment.view", "resident.view", "visitor.view", "visitor.create", "visitor.approve", "service_request.view", "service_request.create", "announcement.view"],
  },
  ops_staff: {
    id: "ops_staff", name: "Nhân viên vận hành", scope: "project",
    description: "Xử lý vận hành chung của dự án.",
    permissions: ROLES_OPS_BASE(),
  },
  tech_staff: {
    id: "tech_staff", name: "Kỹ thuật", scope: "project",
    description: "Kỹ thuật bảo trì & sự cố.",
    permissions: ["building.view", "apartment.view", "service_request.view", "service_request.resolve", "incident.view", "incident.resolve"],
  },
  finance_staff: {
    id: "finance_staff", name: "Kế toán", scope: "project",
    description: "Quản lý thu phí & thanh toán.",
    permissions: ["apartment.view", "resident.view", "fee.view", "fee.create", "fee.edit", "payment.view", "payment.create", "billing.view", "billing.collect"],
  },
  // --- Security Operations extras ---
  security_director: {
    id: "security_director", name: "Security Director", scope: "tenant",
    description: "Giám đốc an ninh — toàn quyền nhánh an ninh.",
    permissions: ["project.view", "building.view", "apartment.view", "resident.view", "staff.view", "staff.create", "staff.edit", "incident.view", "incident.resolve", "visitor.view", "visitor.approve", "visitor.scan", "audit.view"],
  },
  security_supervisor: {
    id: "security_supervisor", name: "Security Supervisor", scope: "project",
    description: "Giám sát an ninh dự án.",
    permissions: ["apartment.view", "resident.view", "staff.view", "incident.view", "incident.resolve", "visitor.view", "visitor.approve", "visitor.scan"],
  },
  guard_captain: {
    id: "guard_captain", name: "Đội trưởng bảo vệ", scope: "project",
    description: "Đội trưởng — phân ca, điều phối tuần tra.",
    permissions: ["apartment.view", "resident.view", "staff.view", "incident.view", "visitor.view", "visitor.approve", "visitor.scan"],
  },
  patrol: {
    id: "patrol", name: "Tuần tra", scope: "project",
    description: "Đội tuần tra & checkpoint.",
    permissions: ["incident.view", "visitor.view"],
  },
  // --- Resident extras ---
  household_member: {
    id: "household_member", name: "Thành viên hộ gia đình", scope: "apartment",
    description: "Thành viên — quyền tương đương cư dân.",
    permissions: [
      "apartment.view", "resident.view", "family.view",
      "service_request.view", "service_request.create",
      "visitor.view", "visitor.create",
      "announcement.view", "fee.view",
    ],
  },
  helper: {
    id: "helper", name: "Người giúp việc", scope: "apartment",
    description: "Người giúp việc được uỷ quyền truy cập căn hộ.",
    permissions: ["apartment.view", "visitor.view"],
  },
};

function ROLES_OPS_BASE(): Permission[] {
  return [
    "project.view", "building.view", "apartment.view",
    "resident.view", "resident.edit", "family.view",
    "service_request.view", "service_request.resolve",
    "incident.view", "visitor.view", "visitor.approve",
    "announcement.view", "announcement.create",
    "fee.view", "payment.view", "payment.create",
  ];
}

export const ROLE_LIST: RoleDefinition[] = Object.values(ROLES);

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLES[role].permissions.includes(permission);
}

export function hasAnyRole(role: Role | null | undefined, roles: Role[]): boolean {
  return !!role && roles.includes(role);
}
