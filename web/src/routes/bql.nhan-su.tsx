import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CrudScreen, type CrudConfig } from "@/components/core/CrudScreen";
import { StatusBadge } from "@/components/core/StatusBadge";
import { useCollection } from "@/mock-data/store";
import { useTenant } from "@/contexts/TenantContext";
import type { Project, Staff } from "@/types/core";

export const Route = createFileRoute("/bql/nhan-su")({
  head: () => ({ meta: [{ title: "Nhân sự — BQL" }] }),
  component: StaffScreen,
});

const POSITIONS = [
  { value: "bql_manager", label: "BQL Manager" },
  { value: "bql_staff", label: "BQL Staff" },
  { value: "security_guard", label: "Bảo vệ" },
  { value: "technician", label: "Kỹ thuật" },
  { value: "accountant", label: "Kế toán" },
  { value: "receptionist", label: "Lễ tân" },
];

function StaffScreen() {
  const staff = useCollection<Staff>("staff");
  const projects = useCollection<Project>("projects");
  const { scope } = useTenant();
  const prjMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const config: CrudConfig<Staff> = {
    collection: "staff",
    entityLabel: "Nhân sự",
    entityLabelPlural: "nhân sự",
    idPrefix: "stf",
    permissions: { view: "staff.view", create: "staff.create", edit: "staff.edit", delete: "staff.delete" },
    searchKeys: ["fullName", "phone", "email"],
    filters: [
      { key: "position", label: "Vị trí", options: POSITIONS },
      { key: "status", label: "Trạng thái", options: [
        { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" },
      ]},
    ],
    columns: [
      { key: "fullName", label: "Họ tên" },
      { key: "position", label: "Vị trí", render: (r) => POSITIONS.find((p) => p.value === r.position)?.label ?? r.position },
      { key: "projectId", label: "Dự án", render: (r) => prjMap.get(r.projectId) ?? "—" },
      { key: "phone", label: "SĐT" },
      { key: "shift", label: "Ca", render: (r) => r.shift ?? "—" },
      { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
    ],
    fields: [
      { key: "fullName", label: "Họ và tên", required: true },
      { key: "phone", label: "Điện thoại", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "position", label: "Vị trí", type: "select", required: true, options: POSITIONS },
      { key: "projectId", label: "Dự án", type: "select", required: true,
        options: scope(projects).map((p) => ({ value: p.id, label: p.name })) },
      { key: "shift", label: "Ca làm", type: "select", options: [
        { value: "morning", label: "Sáng" }, { value: "afternoon", label: "Chiều" }, { value: "night", label: "Đêm" },
      ]},
      { key: "status", label: "Trạng thái", type: "select", required: true, options: [
        { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" },
      ]},
    ],
    defaults: { status: "active", position: "bql_staff" },
  };

  return <CrudScreen<Staff> config={config} rows={scope(staff)} title="Nhân sự BQL" subtitle="Quản lý nhân sự, ca trực và phân quyền vận hành." />;
}
