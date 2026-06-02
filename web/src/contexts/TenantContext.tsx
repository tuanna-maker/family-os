import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCollection } from "@/mock-data/store";
import type { Tenant } from "@/types/core";
import { useMockAuth } from "./MockAuthContext";

const TENANT_KEY = "stos:mock-tenant:v1";

interface Ctx {
  tenants: Tenant[];
  available: Tenant[];                       // tenants the current user can switch between
  currentTenantId: string | null;
  currentTenant: Tenant | null;
  setCurrentTenant: (tenantId: string | null) => void;
  scope: <T extends { tenantId?: string | null }>(rows: T[]) => T[];
}

const TenantCtx = createContext<Ctx | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useMockAuth();
  const tenants = useCollection<Tenant>("tenants");
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Pin tenant for non-super users; super_admin can free-switch
  useEffect(() => {
    if (!user) { setTenantId(null); return; }
    if (user.role === "super_admin") {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(TENANT_KEY) : null;
      setTenantId(stored && tenants.some((t) => t.id === stored) ? stored : (tenants[0]?.id ?? null));
    } else {
      setTenantId(user.tenantId);
    }
  }, [user, tenants]);

  const setCurrentTenant = useCallback((id: string | null) => {
    setTenantId(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(TENANT_KEY, id);
    else window.localStorage.removeItem(TENANT_KEY);
  }, []);

  const currentTenant = useMemo(() => tenants.find((t) => t.id === tenantId) ?? null, [tenants, tenantId]);

  const available = useMemo(() => {
    if (!user) return [];
    if (user.role === "super_admin") return tenants;
    return tenants.filter((t) => t.id === user.tenantId);
  }, [user, tenants]);

  const scope = useCallback(<T extends { tenantId?: string | null }>(rows: T[]): T[] => {
    if (!user) return [];
    if (user.role === "super_admin" && !tenantId) return rows;
    const tid = tenantId ?? user.tenantId;
    if (!tid) return [];
    return rows.filter((r) => !r.tenantId || r.tenantId === tid);
  }, [user, tenantId]);

  const value: Ctx = { tenants, available, currentTenantId: tenantId, currentTenant, setCurrentTenant, scope };
  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant(): Ctx {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error("useTenant must be inside <TenantProvider>");
  return ctx;
}
