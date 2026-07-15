import type { Family, FamilyMember } from "@/types/core";
import { seedApartments } from "./apartments";
import { seedResidents } from "./residents";

const now = new Date().toISOString();

const occupied = seedApartments.filter((a) => a.status === "occupied").slice(0, 24);

export const seedFamilies: Family[] = occupied.map((apt, i) => {
  const head = seedResidents.find((r) => r.apartmentId === apt.id && r.isHeadOfHousehold);
  return {
    id: `fam-${apt.id}`,
    tenantId: apt.tenantId,
    projectId: apt.projectId,
    apartmentId: apt.id,
    name: head ? `Gia đình ${head.fullName.split(" ").slice(-2).join(" ")}` : `Hộ ${apt.code}`,
    headResidentId: head?.id,
    note: i % 4 === 0 ? "Hộ gia đình có người cao tuổi" : undefined,
    createdAt: now,
    updatedAt: now,
  };
});

const MEMBER_NAMES = [
  ["Nguyễn Bảo Long", "child", "Con trai"],
  ["Nguyễn Bảo An", "child", "Con gái"],
  ["Trần Thị Mai", "parent", "Mẹ chồng"],
  ["Lê Văn Hoà", "delegate", "Em ruột (ủy quyền)"],
  ["Chị Hồng", "helper", "Giúp việc"],
  ["BS Nguyễn Tâm", "emergency_contact", "BS gia đình"],
] as const;

export const seedFamilyMembers: FamilyMember[] = seedFamilies.flatMap((f, fi) =>
  MEMBER_NAMES.slice(0, (fi % 4) + 2).map((m, mi) => ({
    id: `fmem-${f.id}-${mi}`,
    tenantId: f.tenantId,
    projectId: f.projectId,
    familyId: f.id,
    apartmentId: f.apartmentId,
    fullName: m[0],
    role: m[1] as FamilyMember["role"],
    relationship: m[2],
    phone: m[1] === "emergency_contact" ? "0987654321" : undefined,
    isEmergencyContact: m[1] === "emergency_contact",
    createdAt: now,
    updatedAt: now,
  })),
);
