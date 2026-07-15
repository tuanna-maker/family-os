import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, RefreshCw, Siren } from "lucide-react";
import { toast } from "sonner";
import { SubHeader } from "./guard.check-in";
import {
  listOpenResidentRequests,
  updateSecurityRequest,
  type OpenSosRow,
  type SecurityRequest,
} from "@/api/security";
import { SosTicketDrawer } from "@/features/security-ops/dashboard/SosTicketDrawer";
import { Button } from "@shared/ui/ui/button";
import { Badge } from "@shared/ui/ui/badge";
import { supabase } from "@shared/supabase/client";

const TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Người lạ / xâm nhập",
  noise: "Tiếng ồn",
  package: "Nhận hàng hộ",
  other: "Khác",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Chờ xử lý",
  in_progress: "Đang xử lý",
};

const TONE: Record<string, string> = {
  sos: "bg-emergency/10 text-emergency",
  fire: "bg-emergency/10 text-emergency",
  intrusion: "bg-warning/10 text-warning",
  package: "bg-brand/10 text-brand",
  noise: "bg-info/10 text-info",
  other: "bg-muted text-foreground",
};

function formatAge(createdAt: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  if (sec < 60) return `${sec} giây`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} giờ ${rm} phút` : `${h} giờ`;
}

function unitLabel(r: SecurityRequest) {
  const parts = [r.apartment, r.building].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Cư dân";
}

function toOpenSosRow(r: SecurityRequest): OpenSosRow {
  const p = (r.payload ?? {}) as Record<string, unknown>;
  const team = (p.team as Record<string, unknown> | undefined) ?? null;
  const created = r.created_at;
  return {
    id: r.id,
    ticket_code: (p.ticket_code as string) ?? `SOS-${r.id.slice(0, 6).toUpperCase()}`,
    priority: (p.priority as OpenSosRow["priority"]) ?? "—",
    incident_type: (p.incident_type as string) ?? TYPE_LABEL.sos,
    zone: ((p.zone as string | undefined) ?? r.building) ?? null,
    location: ((p.location as string | undefined) ?? r.apartment) ?? null,
    team_name: ((team?.name as string | undefined) ?? (p.team_name as string | undefined)) ?? null,
    status: r.status,
    created_at: created,
    age_seconds: Math.max(0, Math.floor((Date.now() - new Date(created).getTime()) / 1000)),
  };
}

function GuardRequestsPage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    refetchInterval: 60_000,
  });
  const [selectedSos, setSelectedSos] = useState<OpenSosRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const ch = supabase
      .channel("guard-requests-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_requests" },
        () => {
          qc.invalidateQueries({ queryKey: ["guard-open-requests"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const rows = useMemo(() => data ?? [], [data]);

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: "in_progress" | "resolved" }) =>
      updateSecurityRequest(vars),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      qc.invalidateQueries({ queryKey: ["guard-open-requests"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Lỗi"),
  });

  return (
    <>
      <SubHeader
        title="YÊU CẦU CƯ DÂN"
        back="/guard"
        right={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 w-9 rounded-full grid place-items-center text-muted-foreground"
            aria-label="Làm mới"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        }
      />

      <section className="px-5 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[11px]">
            {rows.length} đang mở
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Đang tải...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Không có yêu cầu nào đang chờ xử lý.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const isSos = r.request_type === "sos";
              const tone = TONE[r.request_type] ?? TONE.other;
              return (
                <div key={r.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isSos && <Siren className="h-4 w-4 text-emergency shrink-0" />}
                        <p className="text-sm font-semibold truncate">{unitLabel(r)}</p>
                      </div>
                      <span className={`mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full ${tone}`}>
                        {TYPE_LABEL[r.request_type] ?? r.request_type}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {formatAge(r.created_at)}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {STATUS_LABEL[r.status] ?? r.status}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {isSos ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSelectedSos(toOpenSosRow(r));
                          setDrawerOpen(true);
                        }}
                      >
                        Xem SOS
                      </Button>
                    ) : (
                      <>
                        {r.status === "open" && (
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            disabled={statusMut.isPending}
                            onClick={() => statusMut.mutate({ id: r.id, status: "in_progress" })}
                          >
                            Tiếp nhận
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={statusMut.isPending}
                          onClick={() => statusMut.mutate({ id: r.id, status: "resolved" })}
                        >
                          Hoàn thành
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SosTicketDrawer row={selectedSos} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}

export const Route = createFileRoute("/guard/requests")({
  head: () => ({ meta: [{ title: "Yêu cầu cư dân — Bảo vệ" }] }),
  component: GuardRequestsPage,
});
