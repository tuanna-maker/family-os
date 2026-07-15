import type { Building, Block, Floor } from "@/types/core";

const now = new Date().toISOString();
const base = { createdAt: now, updatedAt: now };

export const seedBuildings: Building[] = [
  { id: "bld-park-a",  tenantId: "tnt-stos", projectId: "prj-stos-park", code: "A", name: "Block A",   floors: 25, status: "active", ...base },
  { id: "bld-park-b",  tenantId: "tnt-stos", projectId: "prj-stos-park", code: "B", name: "Block B",   floors: 22, status: "active", ...base },
  { id: "bld-tower-1", tenantId: "tnt-stos", projectId: "prj-stos-tower", code: "T1", name: "Tower 1", floors: 30, status: "active", ...base },
  { id: "bld-sr-a1",   tenantId: "tnt-sunrise", projectId: "prj-sunrise-a", code: "A1", name: "Toà A1", floors: 20, status: "active", ...base },
  { id: "bld-sr-b1",   tenantId: "tnt-sunrise", projectId: "prj-sunrise-b", code: "R1", name: "Riverside 1", floors: 18, status: "active", ...base },
  { id: "bld-gv-p1",   tenantId: "tnt-greenvalley", projectId: "prj-green-pearl", code: "P1", name: "Pearl 1", floors: 15, status: "inactive", ...base },
];

export const seedBlocks: Block[] = [];

export const seedFloors: Floor[] = seedBuildings.flatMap((b) =>
  Array.from({ length: Math.min(b.floors, 3) }, (_, i) => ({
    id: `flr-${b.id}-${i + 1}`,
    tenantId: b.tenantId,
    buildingId: b.id,
    number: i + 1,
    apartmentsCount: 8,
    ...base,
  })),
);
