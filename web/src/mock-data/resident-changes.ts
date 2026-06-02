import type { ResidentChange } from "@/types/core";
import { seedResidents } from "./residents";

const iso = (off: number) => new Date(Date.now() + off * 3600_000).toISOString();

export const seedResidentChanges: ResidentChange[] = seedResidents.slice(0, 20).flatMap((r, i) => [
  {
    id: `rch-${r.id}-c`,
    tenantId: r.tenantId,
    residentId: r.id,
    apartmentId: r.apartmentId,
    actorId: "u-bqls",
    actorName: "Nguyễn Bích Ngọc",
    action: "created",
    note: "Tạo hồ sơ cư dân ban đầu.",
    at: iso(-(240 + i * 6)),
  },
  ...(r.status === "active" ? [{
    id: `rch-${r.id}-v`,
    tenantId: r.tenantId,
    residentId: r.id,
    apartmentId: r.apartmentId,
    actorId: "u-bqlm",
    actorName: "Trần Quốc Anh",
    action: "verified" as const,
    note: "Đã xác minh CCCD và hợp đồng.",
    at: iso(-(200 + i * 6)),
  }] : []),
]);
