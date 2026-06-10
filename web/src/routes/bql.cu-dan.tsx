import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CrudScreen, type CrudConfig } from "@/components/core/CrudScreen";
import { StatusBadge } from "@/components/core/StatusBadge";
import { useCollection } from "@/mock-data/store";
import { useTenant } from "@/contexts/TenantContext";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { hasPermission } from "@/constants/permissions";
import { svc } from "@/lib/services";
import type { Apartment, Resident, ResidentChange } from "@/types/core";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/bql/cu-dan")({
  head: () => ({ meta: [{ title: "Cư dân — BQL" }] }),
  component: ResidentsScreen,
});

function ResidentsScreen() {
  const { user } = useMockAuth();
  const residents = useCollection<Resident>("residents");
  const apartments = useCollection<Apartment>("apartments");
  const changes = useCollection<ResidentChange>("resident_changes");
  const { scope } = useTenant();
  const aptMap = useMemo(() => new Map(apartments.map((a) => [a.id, a.code])), [apartments]);
  const canApprove = hasPermission(user?.role, "resident.approve");

  function verify(r: Resident, approved: boolean) {
    svc.update<Resident>("residents", r.id, { status: approved ? "active" : "rejected" });
    svc.create<ResidentChange>("resident_changes", "rch", {
      tenantId: r.tenantId, residentId: r.id, apartmentId: r.apartmentId,
      actorId: user!.id, actorName: user!.fullName,
      action: approved ? "verified" : "rejected",
      note: approved ? "Xác minh CCCD & hợp đồng." : "Từ chối xác minh.",
      at: new Date().toISOString(),
    } as any);
    toast.success(approved ? "Đã xác minh cư dân" : "Đã từ chối");
  }

  const config: CrudConfig<Resident> = {
    collection: "residents",
    entityLabel: "Cư dân",
    entityLabelPlural: "cư dân",
    idPrefix: "res",
    permissions: { view: "resident.view", create: "resident.create", edit: "resident.edit", delete: "resident.delete" },
    searchKeys: ["fullName", "phone", "email", "idNumber"],
    filters: [
      { key: "status", label: "Trạng thái", options: [
        { value: "active", label: "Active" }, { value: "pending", label: "Pending" },
        { value: "moved_out", label: "Chuyển đi" }, { value: "rejected", label: "Từ chối" },
      ]},
      { key: "relationship", label: "Quan hệ", options: [
        { value: "owner", label: "Chủ sở hữu" }, { value: "tenant", label: "Thuê" }, { value: "family", label: "Người thân" },
      ]},
    ],
    columns: [
      { key: "fullName", label: "Họ tên" },
      { key: "apartmentId", label: "Căn hộ", render: (r) => aptMap.get(r.apartmentId) ?? "—" },
      { key: "phone", label: "Điện thoại" },
      { key: "relationship", label: "Quan hệ" },
      { key: "isHeadOfHousehold", label: "Chủ hộ", render: (r) => r.isHeadOfHousehold ? "✓" : "—" },
      { key: "status", label: "Trạng thái", render: (r) => <StatusBadge status={r.status} /> },
    ],
    fields: [
      { key: "fullName", label: "Họ và tên", required: true },
      { key: "phone", label: "Điện thoại", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "idNumber", label: "CCCD" },
      { key: "apartmentId", label: "Căn hộ", type: "select", required: true,
        options: scope(apartments).map((a) => ({ value: a.id, label: a.code })) },
      { key: "relationship", label: "Quan hệ", type: "select", required: true, options: [
        { value: "owner", label: "Chủ sở hữu" }, { value: "tenant", label: "Thuê" }, { value: "family", label: "Người thân" },
      ]},
      { key: "status", label: "Trạng thái", type: "select", required: true, options: [
        { value: "active", label: "Active" }, { value: "pending", label: "Pending" },
        { value: "moved_out", label: "Chuyển đi" }, { value: "rejected", label: "Từ chối" },
      ]},
    ],
    defaults: { status: "pending", relationship: "owner", isHeadOfHousehold: false },
    detail: (r) => {
      const hist = changes.filter((c) => c.residentId === r.id).sort((a, b) => b.at.localeCompare(a.at));
      return (
        <div className="space-y-3">
          <dl className="space-y-1.5 text-[12px]">
            <Row k="Họ tên" v={r.fullName} />
            <Row k="Căn hộ" v={aptMap.get(r.apartmentId) ?? "—"} />
            <Row k="Điện thoại" v={r.phone} />
            <Row k="Email" v={r.email ?? "—"} />
            <Row k="CCCD" v={r.idNumber ?? "—"} />
            <Row k="Quan hệ" v={r.relationship} />
            <Row k="Chủ hộ" v={r.isHeadOfHousehold ? "Có" : "Không"} />
            <Row k="Trạng thái" v={r.status} />
          </dl>
          {canApprove && r.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => verify(r, true)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Xác minh
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => verify(r, false)}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" />Từ chối
              </Button>
            </div>
          )}
          <div>
            <h4 className="font-semibold text-[12px] mb-1.5">Lịch sử thay đổi</h4>
            <ol className="space-y-1.5 relative border-l pl-3">
              {hist.length === 0 && <li className="text-[11px] text-muted-foreground italic">Chưa có lịch sử.</li>}
              {hist.map((c) => (
                <li key={c.id} className="text-[12px]">
                  <div className="absolute -left-1 mt-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="capitalize">{c.action.replace("_", " ")} — {c.note}</p>
                  <p className="text-[10px] text-muted-foreground">{c.actorName} · {new Date(c.at).toLocaleString("vi-VN")}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      );
    },
  };

  return <CrudScreen<Resident> config={config} rows={scope(residents)} title="Cư dân" subtitle="Phê duyệt, xác minh & quản lý cư dân." />;
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-right">{v}</dd></div>;
}
