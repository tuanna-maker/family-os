import type { Staff, StaffPosition } from "@/types/core";
import { seedProjects } from "./projects";

const now = new Date().toISOString();
const POS: StaffPosition[] = ["bql_manager", "bql_staff", "security_guard", "technician", "accountant", "receptionist"];
const NAMES = [
  "Nguyễn Quang Huy", "Trần Mai Linh", "Lê Đức Toàn", "Phạm Khánh Vy",
  "Hoàng Bảo Long", "Đỗ Phương Trinh", "Vũ Đăng Khoa", "Bùi Thu Trang",
];

export const seedStaff: Staff[] = seedProjects.flatMap((p, pi) =>
  POS.map((position, i) => ({
    id: `stf-${p.id}-${i}`,
    tenantId: p.tenantId,
    projectId: p.id,
    fullName: NAMES[(pi * 6 + i) % NAMES.length],
    phone: `08${String(100000000 + pi * 100 + i * 13).slice(0, 8)}`,
    email: `${position}.${pi}${i}@${p.tenantId.replace("tnt-", "")}.vn`,
    position,
    shift: position === "security_guard" ? (["morning", "afternoon", "night"] as const)[i % 3] : undefined,
    status: i % 7 === 0 ? "inactive" : "active",
    hireDate: now,
    createdAt: now,
    updatedAt: now,
  })),
);
