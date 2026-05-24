import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CrudScreen, type CrudConfig } from "@/components/core/CrudScreen";
import { StatusBadge } from "@/components/core/StatusBadge";
import { useCollection } from "@/mock-data/store";
import { useTenant } from "@/contexts/TenantContext";
import type { Building, Project } from "@/types/core";

export const Route = createFileRoute("/bql/toa-nha")({
  head: () => ({ meta: [{ title: "Toà nhà — BQL" }] }),
  component: BuildingsScreen,
});

function BuildingsScreen() {
  const buildings = useCollection<Building>("buildings");
  const projects = useCollection<Project>("projects");
  const { scope } = useTenant();
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const config: CrudConfig<Building> = {
    collection: "buildings",
    entityLabel: "Toà nhà",
    entityLabelPlural: "toà nhà",
    idPrefix: "bld",
    permissions: { view: "building.view", create: "building.create", edit: "building.edit", delete: "building.delete" },
    searchKeys: ["name", "code"],
    filters: [
      { key: "projectId", label: "Dự án", options: scope(projects).map((p) => ({ value: p.id, label: p.name })) },
      { key: "status", label: "Trạng thái", options: [
        { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" },
      ]},
    ],
    columns: [
      { key: "code", label: "Mã" },
      { key: "name", label: "Tên toà" },
      { key: "projectId", label: "Dự án", render: (r) => projectMap.get(r.projectId) ?? "—" },
      { key: "floors", label: "Số tầng", render: (r) => <span className="tabular-nums">{r.floors}</span> },
      { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
    ],
    fields: [
      { key: "code", label: "Mã toà", required: true },
      { key: "name", label: "Tên toà", required: true },
      { key: "projectId", label: "Dự án", type: "select", required: true,
        options: scope(projects).map((p) => ({ value: p.id, label: p.name })) },
      { key: "floors", label: "Số tầng", type: "number", required: true },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: [
        { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" },
      ]},
    ],
    defaults: { status: "active", floors: 20 },
  };

  return <CrudScreen<Building> config={config} rows={scope(buildings)} title="Toà nhà & tầng" subtitle="Cấu trúc block / floor / apartment." />;
}
