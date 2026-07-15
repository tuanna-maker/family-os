import type { Resident } from "@/types/core";
import { seedApartments } from "./apartments";

const now = new Date().toISOString();
const NAMES = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thu Dung",
  "Hoàng Minh Đức", "Đỗ Thị Hà", "Vũ Quốc Khánh", "Bùi Thanh Lan",
  "Đinh Văn Minh", "Ngô Thị Ngọc", "Lý Hữu Phú", "Trương Diễm Quỳnh",
];

export const seedResidents: Resident[] = seedApartments
  .filter((a) => a.status === "occupied")
  .flatMap((apt, idx) => {
    const headName = NAMES[idx % NAMES.length];
    const head: Resident = {
      id: `res-${apt.id}-h`,
      tenantId: apt.tenantId,
      projectId: apt.projectId,
      apartmentId: apt.id,
      fullName: headName,
      phone: `09${String(100000000 + idx * 137).slice(0, 8)}`,
      email: `${headName.split(" ").pop()?.toLowerCase()}${idx}@stoslife.vn`.replace(/\s/g, ""),
      idNumber: `0790${String(100000 + idx).padStart(9, "0")}`,
      relationship: "owner",
      isHeadOfHousehold: true,
      status: idx % 11 === 0 ? "pending" : "active",
      moveInDate: now,
      createdAt: now,
      updatedAt: now,
    };
    const member: Resident = {
      id: `res-${apt.id}-m`,
      tenantId: apt.tenantId,
      projectId: apt.projectId,
      apartmentId: apt.id,
      fullName: NAMES[(idx + 5) % NAMES.length],
      phone: `09${String(200000000 + idx * 213).slice(0, 8)}`,
      relationship: "family",
      isHeadOfHousehold: false,
      status: "active",
      moveInDate: now,
      createdAt: now,
      updatedAt: now,
    };
    return idx % 2 === 0 ? [head, member] : [head];
  });
