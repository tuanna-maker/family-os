import type { MockUser } from "@/types/core";

// Mock accounts — one per role for demo login.
export const seedUsers: MockUser[] = [
  { id: "u-super",   fullName: "Lê Quang Khải",     email: "super@stos.vn",     role: "super_admin",       tenantId: null },
  { id: "u-tenant",  fullName: "Phan Minh Châu",     email: "tenant@sunrise.vn", role: "tenant_admin",      tenantId: "tnt-sunrise" },
  { id: "u-bqlm",    fullName: "Trần Quốc Anh",      email: "manager@stos.vn",   role: "bql_manager",       tenantId: "tnt-stos",     projectIds: ["prj-stos-park"] },
  { id: "u-bqls",    fullName: "Nguyễn Bích Ngọc",   email: "staff@stos.vn",     role: "bql_staff",         tenantId: "tnt-stos",     projectIds: ["prj-stos-park"] },
  { id: "u-guard",   fullName: "Đỗ Văn Hùng",        email: "guard@stos.vn",     role: "security_guard",    tenantId: "tnt-stos",     projectIds: ["prj-stos-park"] },
  { id: "u-head",    fullName: "Bùi Thu Trang",      email: "head@stos.vn",      role: "head_of_household", tenantId: "tnt-stos",     apartmentId: "apt-flr-bld-park-a-1-1" },
  { id: "u-res",     fullName: "Vũ Hải Minh",        email: "resident@stos.vn",  role: "resident",          tenantId: "tnt-stos",     apartmentId: "apt-flr-bld-park-a-1-1" },
];
