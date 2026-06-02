/**
 * Service layer — thin wrapper around mockStore.
 * Replace internals with Supabase calls without touching screens.
 */
import { mockStore, genId, useCollection } from "@/mock-data/store";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useMemo } from "react";

export interface Scoped<T> {
  rows: T[];
  canCreate: boolean;
}

interface HasTenant { tenantId?: string | null }
interface HasApartment { apartmentId?: string }

/**
 * useScopedCollection — returns rows visible to current user.
 * - super_admin / tenant_admin / bql: scoped by tenant (TenantContext)
 * - resident / head_of_household: scoped to their apartment
 */
export function useScopedCollection<T extends { id: string } & HasTenant & HasApartment>(
  collection: string,
): T[] {
  const all = useCollection<T>(collection);
  const { user } = useMockAuth();
  const { scope } = useTenant();
  return useMemo(() => {
    if (!user) return [];
    if (user.role === "resident" || user.role === "head_of_household") {
      return all.filter((r) => !r.apartmentId || r.apartmentId === user.apartmentId);
    }
    return scope(all);
  }, [all, user, scope]);
}

export const svc = {
  create<T extends { id: string }>(collection: string, idPrefix: string, row: Omit<T, "id" | "createdAt" | "updatedAt"> & Partial<Pick<T, "id">>): T {
    const now = new Date().toISOString();
    const full = {
      id: row.id ?? genId(idPrefix),
      ...row,
      createdAt: now,
      updatedAt: now,
    } as unknown as T;
    return mockStore.insert<T>(collection, full as T);
  },
  update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): T | null {
    return mockStore.update<T>(collection, id, patch);
  },
  remove(collection: string, id: string) {
    return mockStore.remove(collection, id);
  },
  list<T extends { id: string }>(collection: string): T[] {
    return mockStore.list<T>(collection);
  },
};
