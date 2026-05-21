// Tiny reactive in-memory CRUD store keyed by collection name.
// Persists to localStorage so demo data survives reloads.
// Drop-in replaceable with Supabase queries later.

import { useSyncExternalStore } from "react";

type Listener = () => void;

interface CollectionRecord { id: string; tenantId?: string | null }

class MockStore {
  private data = new Map<string, CollectionRecord[]>();
  private listeners = new Map<string, Set<Listener>>();
  private storageKey = "stos:mock-store:v1";

  load(initial: Record<string, CollectionRecord[]>) {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, CollectionRecord[]>;
          for (const [k, v] of Object.entries(parsed)) this.data.set(k, v);
        }
      } catch { /* ignore */ }
    }
    // seed any missing collection
    for (const [k, v] of Object.entries(initial)) {
      if (!this.data.has(k)) this.data.set(k, v);
    }
    this.persist();
  }

  reset(initial: Record<string, CollectionRecord[]>) {
    this.data.clear();
    for (const [k, v] of Object.entries(initial)) this.data.set(k, v);
    this.persist();
    for (const set of this.listeners.values()) set.forEach((l) => l());
  }

  private persist() {
    if (typeof window === "undefined") return;
    const obj: Record<string, unknown> = {};
    for (const [k, v] of this.data.entries()) obj[k] = v;
    try { window.localStorage.setItem(this.storageKey, JSON.stringify(obj)); } catch { /* ignore quota */ }
  }

  private emit(collection: string) {
    this.listeners.get(collection)?.forEach((l) => l());
  }

  subscribe(collection: string, listener: Listener) {
    let set = this.listeners.get(collection);
    if (!set) { set = new Set(); this.listeners.set(collection, set); }
    set.add(listener);
    return () => { set!.delete(listener); };
  }

  list<T extends CollectionRecord>(collection: string): T[] {
    return (this.data.get(collection) ?? []) as T[];
  }

  insert<T extends CollectionRecord>(collection: string, row: T): T {
    const arr = [...this.list<T>(collection), row];
    this.data.set(collection, arr);
    this.persist();
    this.emit(collection);
    return row;
  }

  update<T extends CollectionRecord>(collection: string, id: string, patch: Partial<T>): T | null {
    const arr = this.list<T>(collection);
    const idx = arr.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const next = { ...arr[idx], ...patch, updatedAt: new Date().toISOString() } as T;
    const newArr = [...arr];
    newArr[idx] = next;
    this.data.set(collection, newArr);
    this.persist();
    this.emit(collection);
    return next;
  }

  remove(collection: string, id: string): boolean {
    const arr = this.list(collection);
    const newArr = arr.filter((r) => r.id !== id);
    if (newArr.length === arr.length) return false;
    this.data.set(collection, newArr);
    this.persist();
    this.emit(collection);
    return true;
  }
}

export const mockStore = new MockStore();

// Bootstrap seeds (run once on import)
import { seedTenants } from "./tenants";
import { seedProjects } from "./projects";
import { seedBuildings, seedFloors, seedBlocks } from "./buildings";
import { seedApartments } from "./apartments";
import { seedResidents } from "./residents";
import { seedStaff } from "./staff";
import { seedAuditLogs } from "./audit-logs";
import { seedFamilies, seedFamilyMembers } from "./families";
import { seedVisitors, seedAccessLogs } from "./visitors";
import { seedServiceRequests } from "./service-requests";
import { seedAnnouncements } from "./announcements";
import { seedFees, seedPayments } from "./fees";
import { seedResidentChanges } from "./resident-changes";

const SEEDS = {
  tenants: seedTenants,
  projects: seedProjects,
  buildings: seedBuildings,
  blocks: seedBlocks,
  floors: seedFloors,
  apartments: seedApartments,
  residents: seedResidents,
  staff: seedStaff,
  audit_logs: seedAuditLogs,
  families: seedFamilies,
  family_members: seedFamilyMembers,
  visitors: seedVisitors,
  access_logs: seedAccessLogs,
  service_requests: seedServiceRequests,
  announcements: seedAnnouncements,
  fees: seedFees,
  payments: seedPayments,
  resident_changes: seedResidentChanges,
};

mockStore.load(SEEDS as Record<string, CollectionRecord[]>);

export function resetMockStore() {
  mockStore.reset(SEEDS as Record<string, CollectionRecord[]>);
}

// React hook
export function useCollection<T extends CollectionRecord>(collection: string): T[] {
  return useSyncExternalStore(
    (l) => mockStore.subscribe(collection, l),
    () => mockStore.list<T>(collection),
    () => mockStore.list<T>(collection),
  );
}

export function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
