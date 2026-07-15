import type { Visitor, AccessLog } from "@/types/core";
import { seedResidents } from "./residents";

const now = Date.now();
const iso = (offsetH: number) => new Date(now + offsetH * 3600_000).toISOString();

const PURPOSES: Visitor["purpose"][] = ["guest", "delivery", "service", "family", "other"];
const STATUSES: Visitor["status"][] = ["pending", "active", "active", "used", "expired"];

const heads = seedResidents.filter((r) => r.isHeadOfHousehold).slice(0, 30);

export const seedVisitors: Visitor[] = heads.map((h, i) => ({
  id: `vis-${h.id}-${i}`,
  tenantId: h.tenantId,
  projectId: h.projectId,
  apartmentId: h.apartmentId,
  hostResidentId: h.id,
  hostName: h.fullName,
  visitorName: ["Anh Hùng", "Chị Lan", "Shipper Grab", "Anh Tâm (sửa máy lạnh)", "Bố mẹ vợ"][i % 5],
  visitorPhone: `09${String(300000000 + i * 173).slice(0, 8)}`,
  vehiclePlate: i % 3 === 0 ? `51K-${String(100 + i).padStart(3, "0")}.${String(i * 7 % 100).padStart(2, "0")}` : undefined,
  purpose: PURPOSES[i % PURPOSES.length],
  qrCode: `STOS-QR-${(h.id.slice(-4) + i).toUpperCase()}`,
  validFrom: iso(-2),
  validTo: iso(i % 5 === 4 ? -1 : 22),
  status: STATUSES[i % STATUSES.length],
  note: undefined,
  createdAt: iso(-3),
  updatedAt: iso(-3),
}));

export const seedAccessLogs: AccessLog[] = seedVisitors
  .filter((v) => v.status === "used" || v.status === "active")
  .flatMap((v, i) => [
    {
      id: `alog-${v.id}-in`,
      tenantId: v.tenantId,
      projectId: v.projectId,
      visitorId: v.id,
      apartmentId: v.apartmentId,
      gate: i % 2 === 0 ? "Cổng chính" : "Cổng phụ B",
      direction: "in" as const,
      scannedByName: "Bảo vệ Hùng",
      at: iso(-1),
    },
    ...(v.status === "used" ? [{
      id: `alog-${v.id}-out`,
      tenantId: v.tenantId,
      projectId: v.projectId,
      visitorId: v.id,
      apartmentId: v.apartmentId,
      gate: "Cổng chính",
      direction: "out" as const,
      scannedByName: "Bảo vệ Hùng",
      at: iso(-0.5),
    }] : []),
  ]);
