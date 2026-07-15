import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudConfig } from "@/components/core/CrudScreen";
import { StatusBadge } from "@/components/core/StatusBadge";
import { useCollection } from "@/mock-data/store";
import { useTenant } from "@/contexts/TenantContext";
import type { Project, Tenant } from "@/types/core";
import { useMemo } from "react";

export const Route = createFileRoute("/saas/projects")({
  head: () => ({ meta: [{ title: "Dự án — SaaS Admin" }] }),
  component: ProjectsScreen,
});

function ProjectsScreen() {
  const projects = useCollection<Project>("projects");
  const tenants = useCollection<Tenant>("tenants");
  const { scope } = useTenant();
  const tenantMap = useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  const config: CrudConfig<Project> = {
    collection: "projects",
    entityLabel: "Dự án",
    entityLabelPlural: "dự án",
    idPrefix: "prj",
    permissions: { view: "project.view", create: "project.create", edit: "project.edit", delete: "project.delete" },
    searchKeys: ["name", "code", "city", "address"],
    filters: [
      { key: "status", label: "Trạng thái", options: [
        { value: "active", label: "Active" }, { value: "pending", label: "Pending" }, { value: "archived", label: "Archived" },
      ]},
    ],
    columns: [
      { key: "code", label: "Mã" },
      { key: "name", label: "Tên dự án" },
      { key: "tenantId", label: "Tenant", render: (r) => tenantMap.get(r.tenantId) ?? "—" },
      { key: "city", label: "Thành phố" },
      { key: "managerName", label: "BQL" },
      { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
    ],
    fields: [
      { key: "code", label: "Mã dự án", required: true },
      { key: "name", label: "Tên dự án", required: true },
      { key: "city", label: "Thành phố", required: true },
      { key: "address", label: "Địa chỉ", type: "textarea", required: true },
      { key: "managerName", label: "Trưởng BQL" },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: [
        { value: "active", label: "Active" }, { value: "pending", label: "Pending" }, { value: "archived", label: "Archived" },
      ]},
    ],
    defaults: { status: "active" },
  };

  return <CrudScreen<Project> config={config} rows={scope(projects)} title="Dự án" subtitle="Danh sách dự án theo tenant." />;
}
