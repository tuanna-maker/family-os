import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Clock, Siren, RefreshCw, AlertTriangle } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@shared/supabase/get-client";
import { SubHeader } from "@mobile/components/SubHeader";
import { Button } from "@mobile/components/ui/Button";
import { SosTicketDrawer } from "@mobile/components/SosTicketDrawer";
import {
  listOpenResidentRequests,
  updateSecurityRequest,
  type OpenSosRow,
  type SecurityRequest,
} from "@guard/api/security";
import { formatAge, REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@mobile/utils/guardFormat";
import { useTheme } from "@mobile/theme/themeStore";

const TONE: Record<string, { bg: string; text: string }> = {
  sos: { bg: "bg-red-500/15", text: "text-red-600" },
  fire: { bg: "bg-red-500/15", text: "text-red-600" },
  intrusion: { bg: "bg-amber-500/15", text: "text-amber-700" },
  package: { bg: "bg-blue-500/15", text: "text-blue-700" },
  noise: { bg: "bg-sky-500/15", text: "text-sky-700" },
  other: { bg: "bg-muted", text: "text-muted-foreground" },
};

type FilterKey = "all" | "sos" | "other";

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
    incident_type: (p.incident_type as string) ?? REQUEST_TYPE_LABEL.sos,
    zone: ((p.zone as string | undefined) ?? r.building) ?? null,
    location: ((p.location as string | undefined) ?? r.apartment) ?? null,
    team_name: ((team?.name as string | undefined) ?? (p.team_name as string | undefined)) ?? null,
    status: r.status,
    created_at: created,
    age_seconds: Math.max(0, Math.floor((Date.now() - new Date(created).getTime()) / 1000)),
  };
}

function sortRequests(rows: SecurityRequest[]) {
  return [...rows].sort((a, b) => {
    const aSos = a.request_type === "sos" ? 1 : 0;
    const bSos = b.request_type === "sos" ? 1 : 0;
    if (aSos !== bSos) return bSos - aSos;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function RequestsScreen() {
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    refetchInterval: 60_000,
  });
  const [selectedSos, setSelectedSos] = useState<OpenSosRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const supabase = getSupabase();
    const ch = supabase
      .channel("guard-requests-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_requests" },
        () => qc.invalidateQueries({ queryKey: ["guard-open-requests"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const allRows = useMemo(() => sortRequests(data ?? []), [data]);
  const sosRows = useMemo(() => allRows.filter((r) => r.request_type === "sos"), [allRows]);
  const rows = useMemo(() => {
    if (filter === "sos") return sosRows;
    if (filter === "other") return allRows.filter((r) => r.request_type !== "sos");
    return allRows;
  }, [allRows, filter, sosRows]);

  const openSos = (r: SecurityRequest) => {
    setSelectedSos(toOpenSosRow(r));
    setDrawerOpen(true);
  };

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: "in_progress" | "resolved" }) =>
      updateSecurityRequest(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guard-open-requests"] }),
  });

  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: "Tất cả", count: allRows.length },
    { key: "sos", label: "SOS khẩn cấp", count: sosRows.length },
    { key: "other", label: "Yêu cầu khác", count: allRows.length - sosRows.length },
  ];

  return (
    <View className="flex-1 bg-background">
      <SubHeader
        title="YÊU CẦU CƯ DÂN"
        right={
          <TouchableOpacity onPress={() => refetch()} disabled={isFetching} className="p-2">
            <RefreshCw size={20} color={colors.muted} />
          </TouchableOpacity>
        }
      />

      <ScrollView className="flex-1 p-4">
        {sosRows.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openSos(sosRows[0])}
            className="mb-4 rounded-2xl border-2 border-red-500 bg-red-500/10 p-4"
          >
            <View className="flex-row items-center gap-2 mb-2">
              <Siren size={22} color="#ef4444" />
              <Text className="text-base font-bold text-red-600">SOS KHẨN CẤP</Text>
            </View>
            <Text className="text-sm text-foreground font-semibold">
              {sosRows.length} cuộc gọi SOS đang chờ xử lý
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              Nhấn để mở phiếu SOS mới nhất · {unitLabel(sosRows[0])}
            </Text>
            <View className="mt-3 bg-red-500 rounded-xl py-2.5 items-center">
              <Text className="text-white font-bold text-sm">XỬ LÝ SOS NGAY</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View className="mb-3 flex-row flex-wrap gap-2">
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full border ${
                filter === f.key ? "bg-brand/15 border-brand" : "bg-muted border-border"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  filter === f.key ? "text-brand" : "text-muted-foreground"
                }`}
              >
                {f.label}
                {typeof f.count === "number" ? ` (${f.count})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" className="mt-10" color={colors.brand} />
        ) : rows.length === 0 ? (
          <View className="items-center mt-10 px-6">
            <AlertTriangle size={32} color={colors.muted} />
            <Text className="text-center text-muted-foreground mt-3">
              {filter === "sos"
                ? "Không có SOS khẩn cấp đang chờ."
                : "Không có yêu cầu nào đang chờ xử lý."}
            </Text>
            <Text className="text-center text-xs text-muted-foreground mt-2">
              Yêu cầu từ cư dân và SOS sẽ hiện tại đây theo thời gian thực.
            </Text>
          </View>
        ) : (
          rows.map((r) => {
            const isSos = r.request_type === "sos";
            const tone = TONE[r.request_type] ?? TONE.other;
            const p = (r.payload ?? {}) as Record<string, unknown>;
            const ticketCode =
              (p.ticket_code as string) ?? (isSos ? `SOS-${r.id.slice(0, 6).toUpperCase()}` : null);

            return (
              <View
                key={r.id}
                className={`rounded-2xl p-4 mb-3 border shadow-sm ${
                  isSos ? "bg-red-500/8 border-red-400/60" : "bg-card border-border"
                }`}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      {isSos ? <Siren size={18} color="#ef4444" /> : null}
                      <Text className="text-sm font-bold text-foreground">{unitLabel(r)}</Text>
                    </View>
                    {ticketCode ? (
                      <Text className="text-xs font-mono text-red-600 mt-1">{ticketCode}</Text>
                    ) : null}
                    <View className={`mt-1.5 self-start px-2 py-0.5 rounded-full ${tone.bg}`}>
                      <Text className={`text-[11px] font-medium ${tone.text}`}>
                        {REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}
                      </Text>
                    </View>
                    {isSos && p.incident_type ? (
                      <Text className="text-xs text-muted-foreground mt-1">
                        Loại: {String(p.incident_type)}
                        {p.priority ? ` · Ưu tiên: ${String(p.priority)}` : ""}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Clock size={12} color={colors.muted} />
                      <Text className="text-[11px] text-muted-foreground ml-1">
                        {formatAge(r.created_at)}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-muted-foreground mt-1">
                      {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                    </Text>
                  </View>
                </View>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {isSos ? (
                    <Button
                      className="h-9 flex-1 bg-red-500"
                      size="sm"
                      onPress={() => openSos(r)}
                    >
                      Xử lý SOS
                    </Button>
                  ) : (
                    <>
                      {r.status === "open" && (
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={statusMut.isPending}
                          onPress={() =>
                            statusMut.mutate({ id: r.id, status: "in_progress" })
                          }
                        >
                          Tiếp nhận
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={statusMut.isPending}
                        onPress={() => statusMut.mutate({ id: r.id, status: "resolved" })}
                      >
                        Hoàn thành
                      </Button>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <SosTicketDrawer
        row={selectedSos}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  );
}
