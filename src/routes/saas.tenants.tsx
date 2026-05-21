import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudConfig } from "@/components/core/CrudScreen";
import { StatusBadge } from "@/components/core/StatusBadge";
import type { Tenant } from "@/types/core";

export const Route = createFileRoute("/saas/tenants")({
  head: () => ({ meta: [{ title: "Tenants — SaaS Admin" }] }),
  component: TenantsScreen,
});

const config: CrudConfig<Tenant> = {
  collection: "tenants",
  entityLabel: "Tenant",
  entityLabelPlural: "Tenants",
  idPrefix: "tnt",
  scopeByTenant: false,
  permissions: { view: "tenant.view", create: "tenant.create", edit: "tenant.edit", delete: "tenant.delete" },
  searchKeys: ["name", "code", "contactEmail"],
  filters: [
    { key: "plan", label: "Gói", options: [
      { value: "starter", label: "Starter" }, { value: "pro", label: "Pro" }, { value: "enterprise", label: "Enterprise" },
    ]},
    { key: "status", label: "Trạng thái", options: [
      { value: "active", label: "Active" }, { value: "pending", label: "Pending" }, { value: "suspended", label: "Suspended" },
    ]},
  ],
  columns: [
    { key: "code", label: "Mã" },
    { key: "name", label: "Tên tenant" },
    { key: "plan", label: "Gói", render: (r) => <span className="capitalize font-medium">{r.plan}</span> },
    { key: "contactEmail", label: "Liên hệ" },
    { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
  ],
  fields: [
    { key: "code", label: "Mã tenant (slug)", required: true, placeholder: "vd: sunrise-city" },
    { key: "name", label: "Tên hiển thị", required: true },
    { key: "plan", label: "Gói dịch vụ", type: "select", required: true, options: [
      { value: "starter", label: "Starter" }, { value: "pro", label: "Pro" }, { value: "enterprise", label: "Enterprise" },
    ]},
    { key: "contactEmail", label: "Email liên hệ", type: "email", required: true },
    { key: "contactPhone", label: "Điện thoại" },
    { key: "status", label: "Trạng thái", type: "select", required: true, options: [
      { value: "active", label: "Active" }, { value: "pending", label: "Pending" }, { value: "suspended", label: "Suspended" },
    ]},
  ],
  defaults: { status: "pending", plan: "starter" },
};

function TenantsScreen() {
  return <CrudScreen<Tenant> config={config} title="Tenants" subtitle="Quản trị tổ chức khách hàng trên nền tảng STOS." />;
}
