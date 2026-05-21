import type { Apartment, ApartmentStatus } from "@/types/core";
import { seedFloors } from "./buildings";

const now = new Date().toISOString();
const TYPES: Apartment["type"][] = ["1BR", "2BR", "3BR", "Studio"];
const STATUSES: ApartmentStatus[] = ["occupied", "occupied", "occupied", "vacant", "maintenance"];

export const seedApartments: Apartment[] = seedFloors.flatMap((f) =>
  Array.from({ length: 4 }, (_, i) => {
    const idx = i + 1;
    const t = TYPES[(f.number + i) % TYPES.length];
    const status = STATUSES[(f.number * 3 + i) % STATUSES.length];
    return {
      id: `apt-${f.id}-${idx}`,
      tenantId: f.tenantId,
      projectId: f.buildingId.includes("park") ? "prj-stos-park"
        : f.buildingId.includes("tower") ? "prj-stos-tower"
        : f.buildingId.includes("sr-a") ? "prj-sunrise-a"
        : f.buildingId.includes("sr-b") ? "prj-sunrise-b"
        : "prj-green-pearl",
      buildingId: f.buildingId,
      floorId: f.id,
      code: `${f.buildingId.split("-").pop()?.toUpperCase()}-${String(f.number).padStart(2, "0")}-${String(idx).padStart(2, "0")}`,
      type: t,
      areaSqm: t === "Studio" ? 35 : t === "1BR" ? 52 : t === "2BR" ? 68 : 92,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }),
);
