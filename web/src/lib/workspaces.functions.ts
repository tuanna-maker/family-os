import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WorkspaceKind =
  | "resident"
  | "bql"
  | "tenant_admin"
  | "saas_admin"
  | "platform"
  | "ops"
  | "security"
  | "family_gov"
  | "guard";

export type WorkspaceItem = {
  kind: WorkspaceKind;
  id: string; // family/project/tenant id or "saas"
  name: string;
  subtitle?: string | null;
  /** role specific to this workspace */
  role: string;
  /** target route to enter this workspace */
  to: string;
};

export type MyWorkspaces = {
  items: WorkspaceItem[];
  hasResident: boolean;
  hasBql: boolean;
  hasTenantAdmin: boolean;
  hasSaasAdmin: boolean;
};

/**
 * List every workspace the current user has access to:
 * - Resident (per family they own/belong to)
 * - BQL (per project they manage/staff)
 * - Tenant admin (per tenant they administer)
 * - SaaS admin (single global workspace)
 */
export const listMyWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyWorkspaces> => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, family_id, project_id, tenant_id")
      .eq("user_id", userId);

    const rs = roles ?? [];
    const items: WorkspaceItem[] = [];

    const hasSaasAdmin = rs.some((r) => r.role === "super_admin" || r.role === "saas_admin");
    if (hasSaasAdmin) {
      items.push(
        {
          kind: "saas_admin",
          id: "saas",
          name: "SaaS Admin",
          subtitle: "Quản trị nền tảng STOS Life",
          role: "super_admin",
          to: "/saas",
        },
        {
          kind: "platform",
          id: "platform",
          name: "Platform Console",
          subtitle: "Toàn quyền console nền tảng",
          role: "super_admin",
          to: "/console",
        },
        {
          kind: "ops",
          id: "ops",
          name: "Operations Console",
          subtitle: "Toàn quyền vận hành cộng đồng",
          role: "super_admin",
          to: "/ops",
        },
        {
          kind: "bql",
          id: "bql-all",
          name: "BQL Portal",
          subtitle: "Toàn quyền ban quản lý dự án",
          role: "super_admin",
          to: "/bql",
        },
        {
          kind: "security",
          id: "security",
          name: "Security Operations",
          subtitle: "Toàn quyền trung tâm an ninh",
          role: "super_admin",
          to: "/security",
        },
        {
          kind: "family_gov",
          id: "family-gov",
          name: "Family Core Governance",
          subtitle: "Toàn quyền quản trị hộ gia đình",
          role: "super_admin",
          to: "/family",
        },
      );
    }

    // Tenant admin workspaces
    const tenantIds = Array.from(
      new Set(rs.filter((r) => r.role === "tenant_admin" && r.tenant_id).map((r) => r.tenant_id!)),
    );
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, slug, plan, status")
        .in("id", tenantIds);
      for (const t of tenants ?? []) {
        items.push({
          kind: "tenant_admin",
          id: t.id,
          name: t.name,
          subtitle: `Tenant · ${t.plan} · ${t.status}`,
          role: "tenant_admin",
          to: "/saas",
        });
      }
    }

    // BQL workspaces
    const projectIds = Array.from(
      new Set(
        rs
          .filter(
            (r) => (r.role === "bql_manager" || r.role === "bql_staff") && r.project_id,
          )
          .map((r) => r.project_id!),
      ),
    );
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, code, city, status")
        .in("id", projectIds);
      for (const p of projects ?? []) {
        const r = rs.find((x) => x.project_id === p.id);
        items.push({
          kind: "bql",
          id: p.id,
          name: p.name,
          subtitle: `BQL · ${p.code}${p.city ? ` · ${p.city}` : ""}`,
          role: r?.role ?? "bql_staff",
          to: "/bql",
        });
      }
    }

    // Resident workspaces
    const familyIdsFromRoles = Array.from(
      new Set(
        rs
          .filter(
            (r) => (r.role === "family_owner" || r.role === "family_member") && r.family_id,
          )
          .map((r) => r.family_id!),
      ),
    );
    const { data: ownedFamilies } = await supabase
      .from("families")
      .select("id, name, apartment, owner_id")
      .eq("owner_id", userId);
    const familySet = new Map<string, { id: string; name: string; apartment: string | null; role: string }>();
    for (const f of ownedFamilies ?? []) {
      familySet.set(f.id, { id: f.id, name: f.name, apartment: f.apartment, role: "family_owner" });
    }
    if (familyIdsFromRoles.length > 0) {
      const missing = familyIdsFromRoles.filter((id) => !familySet.has(id));
      if (missing.length > 0) {
        const { data: extras } = await supabase
          .from("families")
          .select("id, name, apartment, owner_id")
          .in("id", missing);
        for (const f of extras ?? []) {
          const r = rs.find((x) => x.family_id === f.id);
          familySet.set(f.id, {
            id: f.id,
            name: f.name,
            apartment: f.apartment,
            role: r?.role ?? "family_member",
          });
        }
      }
    }
    for (const f of familySet.values()) {
      items.push({
        kind: "resident",
        id: f.id,
        name: f.name,
        subtitle: f.apartment ? `Cư dân · ${f.apartment}` : "Cư dân",
        role: f.role,
        to: "/portal",
      });
    }

    const hasGuardRole = rs.some((r) =>
      ["security_admin", "security_staff"].includes(r.role),
    );
    if (hasGuardRole || hasSaasAdmin) {
      items.push({
        kind: "guard",
        id: "guard-mobile",
        name: "STOS Guard",
        subtitle: "Ca trực · tuần tra · quét QR",
        role: hasSaasAdmin ? "super_admin" : "security_staff",
        to: "/guard",
      });
    }

    return {
      items,
      hasResident: familySet.size > 0,
      hasBql: projectIds.length > 0,
      hasTenantAdmin: tenantIds.length > 0,
      hasSaasAdmin,
    };
  });
