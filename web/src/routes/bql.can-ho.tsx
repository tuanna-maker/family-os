import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CrudScreen, type CrudConfig } from "@/components/core/CrudScreen";
import { StatusBadge } from "@/components/core/StatusBadge";
import { useCollection } from "@/mock-data/store";
import { useTenant } from "@/contexts/TenantContext";
import type { Apartment, Building } from "@/types/core";

export const Route = createFileRoute("/bql/can-ho")({
  head: () => ({ meta: [{ title: "Căn hộ — BQL" }] }),
  component: ApartmentsScreen,
});

function ApartmentsScreen() {
  const apartments = useCollection<Apartment>("apartments");
  const buildings = useCollection<Building>("buildings");
  const { scope } = useTenant();
  const bldMap = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  const config: CrudConfig<Apartment> = {
    collection: "apartments",
    entityLabel: "Căn hộ",
    entityLabelPlural: "căn hộ",
    idPrefix: "apt",
    permissions: { view: "apartment.view", create: "apartment.create", edit: "apartment.edit", delete: "apartment.delete" },
    searchKeys: ["code"],
    filters: [
      { key: "buildingId", label: "Toà nhà", options: scope(buildings).map((b) => ({ value: b.id, label: b.name })) },
      { key: "status", label: "Trạng thái", options: [
        { value: "occupied", label: "Đang ở" }, { value: "vacant", label: "Trống" },
        { value: "maintenance", label: "Bảo trì" }, { value: "reserved", label: "Đặt giữ" },
      ]},
      { key: "type", label: "Loại", options: [
        { value: "Studio", label: "Studio" }, { value: "1BR", label: "1BR" }, { value: "2BR", label: "2BR" }, { value: "3BR", label: "3BR" },
      ]},
    ],
    columns: [
      { key: "code", label: "Mã căn" },
      { key: "buildingId", label: "Toà", render: (r) => bldMap.get(r.buildingId) ?? "—" },
      { key: "type", label: "Loại" },
      { key: "areaSqm", label: "Diện tích", render: (r) => <span className="tabular-nums">{r.areaSqm} m²</span> },
      { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
    ],
    fields: [
      { key: "code", label: "Mã căn", required: true },
      { key: "buildingId", label: "Toà nhà", type: "select", required: true,
        options: scope(buildings).map((b) => ({ value: b.id, label: b.name })) },
      { key: "type", label: "Loại", type: "select", required: true, options: [
        { value: "Studio", label: "Studio" }, { value: "1BR", label: "1BR" }, { value: "2BR", label: "2BR" }, { value: "3BR", label: "3BR" },
      ]},
      { key: "areaSqm", label: "Diện tích (m²)", type: "number", required: true },
      { key: "status", label: "Trạng thái", type: "select", required: true, options: [
        { value: "occupied", label: "Đang ở" }, { value: "vacant", label: "Trống" },
        { value: "maintenance", label: "Bảo trì" }, { value: "reserved", label: "Đặt giữ" },
      ]},
    ],
    defaults: { status: "vacant", type: "2BR", areaSqm: 68 },
  };

  return <CrudScreen<Apartment> config={config} rows={scope(apartments)} title="Căn hộ" subtitle="Toàn bộ căn hộ trong tenant hiện tại." />;
}
