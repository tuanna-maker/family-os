import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { seedUsers } from "@/mock-data/users";
import type { MockUser, Permission, Role } from "@/types/core";
import { hasPermission as hasPerm } from "@/constants/permissions";

const SESSION_KEY = "stos:mock-session:v1";

interface Ctx {
  user: MockUser | null;
  users: MockUser[];
  isAuthenticated: boolean;
  signIn: (userId: string) => void;
  signOut: () => void;
  switchRole: (userId: string) => void;
  can: (permission: Permission) => boolean;
  hasRole: (...roles: Role[]) => boolean;
}

const MockAuthCtx = createContext<Ctx | null>(null);

const CLOUD_ROLE_TO_UI_ROLE: Array<{ cloud: string; ui: Role }> = [
  { cloud: "super_admin", ui: "super_admin" },
  { cloud: "saas_admin", ui: "super_admin" },
  { cloud: "tenant_admin", ui: "tenant_admin" },
  { cloud: "bql_manager", ui: "bql_manager" },
  { cloud: "bql_staff", ui: "bql_staff" },
  { cloud: "security_admin", ui: "security_director" },
  { cloud: "security_staff", ui: "security_guard" },
  { cloud: "technician", ui: "tech_staff" },
  { cloud: "accountant", ui: "finance_staff" },
  { cloud: "family_owner", ui: "head_of_household" },
  { cloud: "family_member", ui: "resident" },
];

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudRoles, setCloudRoles] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored && seedUsers.some((u) => u.id === stored)) setUserId(stored);
  }, []);

  const persist = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(SESSION_KEY, id);
    else window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const user = useMemo(() => seedUsers.find((u) => u.id === userId) ?? null, [userId]);

  useEffect(() => {
    let cancelled = false;
    if (!authUser?.id) {
      setCloudRoles([]);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .then(({ data }) => {
        if (!cancelled) setCloudRoles((data ?? []).map((r) => r.role as string));
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  const cloudUser = useMemo<MockUser | null>(() => {
    if (!authUser) return null;
    const mappedRole = CLOUD_ROLE_TO_UI_ROLE.find((r) => cloudRoles.includes(r.cloud))?.ui;
    if (!mappedRole) return null;
    return {
      id: authUser.id,
      fullName:
        (authUser.user_metadata?.full_name as string | undefined) ??
        authUser.email ??
        "Người dùng",
      email: authUser.email ?? "",
      role: mappedRole,
      tenantId: null,
    };
  }, [authUser, cloudRoles]);

  const effectiveUser = authUser ? cloudUser : user;

  const value: Ctx = useMemo(() => ({
    user: effectiveUser,
    users: seedUsers,
    isAuthenticated: !!effectiveUser,
    signIn: (id) => { setUserId(id); persist(id); },
    signOut: () => { setUserId(null); persist(null); },
    switchRole: (id) => { setUserId(id); persist(id); },
    can: (p) => hasPerm(effectiveUser?.role, p),
    hasRole: (...roles) => !!effectiveUser && roles.includes(effectiveUser.role),
  }), [effectiveUser, persist]);

  return <MockAuthCtx.Provider value={value}>{children}</MockAuthCtx.Provider>;
}

export function useMockAuth(): Ctx {
  const ctx = useContext(MockAuthCtx);
  if (!ctx) throw new Error("useMockAuth must be inside <MockAuthProvider>");
  return ctx;
}
