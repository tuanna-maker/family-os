import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Clock, Siren, RefreshCw } from "lucide-react-native";
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

const TONE: Record<string, string> = {
  sos: "bg-red-100 text-red-700",
  fire: "bg-red-100 text-red-700",
  intrusion: "bg-amber-100 text-amber-800",
  package: "bg-blue-100 text-blue-700",
  noise: "bg-sky-100 text-sky-700",
  other: "bg-muted text-muted-foreground",
};

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

export default function RequestsScreen() {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    refetchInterval: 60_000,
  });
  const [selectedSos, setSelectedSos] = useState<OpenSosRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const rows = useMemo(() => data ?? [], [data]);

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: "in_progress" | "resolved" }) =>
      updateSecurityRequest(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guard-open-requests"] }),
  });

  return (
    <View className="flex-1 bg-background">
      <SubHeader
        title="YÊU CẦU CƯ DÂN"
        right={
          <TouchableOpacity onPress={() => refetch()} disabled={isFetching} className="p-2">
            <RefreshCw size={20} color="#6b7280" />
          </TouchableOpacity>
        }
      />

      <ScrollView className="flex-1 p-4">
        <View className="mb-3 flex-row">
          <View className="bg-muted px-3 py-1 rounded-full border border-border">
            <Text className="text-xs text-muted-foreground font-medium">{rows.length} đang mở</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" className="mt-10" />
        ) : rows.length === 0 ? (
          <Text className="text-center text-muted-foreground mt-10">
            Không có yêu cầu nào đang chờ xử lý.
          </Text>
        ) : (
          rows.map((r) => {
            const isSos = r.request_type === "sos";
            const tone = TONE[r.request_type] ?? TONE.other;
            return (
              <View key={r.id} className="bg-card rounded-2xl p-4 mb-3 border border-border shadow-sm">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      {isSos && <Siren size={16} color="#ef4444" />}
                      <Text className="text-sm font-bold text-foreground">{unitLabel(r)}</Text>
                    </View>
                    <View className={`mt-1.5 self-start px-2 py-0.5 rounded-full ${tone}`}>
                      <Text className="text-[11px] font-medium">
                        {REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Clock size={12} color="#6b7280" />
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
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onPress={() => {
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
