import { useSyncExternalStore } from "react";

export type DispatchPriority = "P1" | "P2" | "P3";

export type DispatchRecord = {
  id: string;             // SOS-xxxxxx
  createdAt: number;
  priority: DispatchPriority;
  incidentType: string;   // label
  zone: string;
  location?: string;
  teamId: string;
  teamName: string;
  autoAssigned: boolean;
  note?: string;
  status: "dispatched" | "ack" | "on_site" | "closed";
};

const TEAMS = [
  { id: "T-A", name: "Đội A · Cổng & Lobby (4 người)", zones: ["Cổng chính", "Lobby A", "Lobby B", "Sảnh sự kiện"] },
  { id: "T-B", name: "Đội B · Tháp A/B (5 người)",     zones: ["Tháp A", "Tháp B"] },
  { id: "T-C", name: "Đội C · Hầm xe (3 người)",       zones: ["Tầng hầm B1", "Tầng hầm B2"] },
  { id: "T-D", name: "Đội D · Cơ động (2 người)",      zones: [] }, // fallback / P1 backup
];

export const ALL_TEAMS = TEAMS;

/** Auto-pick team based on zone + priority. P1 always gets cơ động as backup. */
export function suggestTeam(zone: string, priority: DispatchPriority) {
  const byZone = TEAMS.find((t) => t.zones.includes(zone));
  if (priority === "P1") {
    // Prefer zone team, fall back to cơ động
    return byZone ?? TEAMS.find((t) => t.id === "T-D")!;
  }
  return byZone ?? TEAMS.find((t) => t.id === "T-D")!;
}

// -------- tiny store --------
let records: DispatchRecord[] = [];
const listeners = new Set<() => void>();

function emit() {
  records = [...records];
  listeners.forEach((l) => l());
}

export function addDispatch(
  rec: Omit<DispatchRecord, "id" | "createdAt" | "status"> & {
    id?: string;
    status?: DispatchRecord["status"];
  },
) {
  const id = rec.id ?? `SOS-${Date.now().toString().slice(-6)}`;
  const full: DispatchRecord = {
    ...rec,
    id,
    createdAt: Date.now(),
    status: rec.status ?? "dispatched",
  };
  records = [full, ...records];
  listeners.forEach((l) => l());
  return full;
}

export function updateDispatchStatus(id: string, status: DispatchRecord["status"]) {
  records = records.map((r) => (r.id === id ? { ...r, status } : r));
  listeners.forEach((l) => l());
}

export function useDispatchRecords() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => records,
    () => records,
  );
}
