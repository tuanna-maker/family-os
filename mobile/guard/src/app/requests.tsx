import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock, Siren, RefreshCw, AlertTriangle, CheckSquare, Square } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@shared/supabase/get-client";
import { showAppAlert } from "@mobile/components/AppAlert";
import { SubHeader } from "@mobile/components/SubHeader";
import { Button } from "@mobile/components/ui/Button";
import { SosTicketDrawer } from "@mobile/components/SosTicketDrawer";
import {
  batchUpdateSecurityRequests,
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
type ActionStatus = "in_progress" | "resolved";

function unitLabel(r: SecurityRequest) {
  const parts = [r.apartment, r.building].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Cư dân";
}

function actionKey(id: string, status: ActionStatus) {
  return `${id}:${status}`;
}

function canClaim(r: SecurityRequest) {
  return r.request_type !== "sos" && r.status === "open";
}

function canResolve(r: SecurityRequest) {
  return r.request_type !== "sos" && (r.status === "open" || r.status === "in_progress");
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

function statusAlertMessage(status: ActionStatus, ok: number, fail: number) {
  const action =
    status === "in_progress"
      ? { verb: "tiếp nhận", family: "Bảo vệ đã tiếp nhận yêu cầu của bạn." }
      : { verb: "hoàn thành", family: "Bảo vệ đã hoàn tất xử lý yêu cầu của bạn." };

  if (fail === 0) {
    return {
      title: status === "in_progress" ? "Đã tiếp nhận" : "Đã hoàn thành",
      message:
        ok === 1
          ? `Đã ${action.verb} yêu cầu. Cư dân sẽ nhận thông báo: "${action.family}"`
          : `Đã ${action.verb} ${ok} yêu cầu. Cư dân sẽ nhận thông báo trên app Family.`,
    };
  }

  return {
    title: "Hoàn tất một phần",
    message: `Thành công ${ok}, thất bại ${fail}. Vui lòng thử lại các yêu cầu còn lại.`,
  };
}

export default function RequestsScreen() {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    staleTime: 45_000,
  });
  const [selectedSos, setSelectedSos] = useState<OpenSosRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState<ActionStatus | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    const ch = supabase
      .channel("guard-requests-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_requests" },
        (payload) => {
          const row = (payload.new ?? payload.old) as SecurityRequest | undefined;
          if (!row?.id) return;
          qc.setQueryData<SecurityRequest[]>(["guard-open-requests"], (old) => {
            const prev = old ?? [];
            const without = prev.filter((r) => r.id !== row.id);
            if (payload.eventType === "DELETE") return without;
            const open = row.status === "open" || row.status === "in_progress";
            if (!open) return without;
            return sortRequests([row, ...without]);
          });
        },
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

  const selectableRows = useMemo(() => rows.filter((r) => r.request_type !== "sos"), [rows]);
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selectedIds.has(r.id));

  const selectedRows = useMemo(
    () => selectableRows.filter((r) => selectedIds.has(r.id)),
    [selectableRows, selectedIds],
  );
  const selectedClaimable = selectedRows.filter(canClaim);
  const selectedResolvable = selectedRows.filter(canResolve);

  const patchCacheMany = (ids: string[], status: ActionStatus) => {
    const idSet = new Set(ids);
    qc.setQueryData<SecurityRequest[]>(["guard-open-requests"], (old) => {
      if (!old) return old;
      if (status === "resolved") return old.filter((r) => !idSet.has(r.id));
      return old.map((r) => (idSet.has(r.id) ? { ...r, status } : r));
    });
  };

  const runStatusUpdate = async (ids: string[], status: ActionStatus) => {
    const eligible = ids.filter((id) => {
      const row = allRows.find((r) => r.id === id);
      if (!row) return false;
      return status === "in_progress" ? canClaim(row) : canResolve(row);
    });

    if (eligible.length === 0) {
      showAppAlert({
        title: "Không thể thực hiện",
        message:
          status === "in_progress"
            ? "Chỉ tiếp nhận được yêu cầu đang ở trạng thái Chờ xử lý."
            : "Không có yêu cầu phù hợp để hoàn thành.",
      });
      return;
    }

    const isBulk = eligible.length > 1;
    const keys = eligible.map((id) => actionKey(id, status));
    if (isBulk) setBulkLoading(status);
    else setLoadingKeys((prev) => new Set([...prev, ...keys]));

    try {
      const results = isBulk
        ? await batchUpdateSecurityRequests({ ids: eligible, status })
        : await (async () => {
            const id = eligible[0];
            try {
              await updateSecurityRequest({ id, status });
              return [{ id, ok: true as const }];
            } catch (e) {
              return [
                {
                  id,
                  ok: false as const,
                  error: e instanceof Error ? e.message : "Không cập nhật được trạng thái",
                },
              ];
            }
          })();

      const succeeded = results.filter((r) => r.ok).map((r) => r.id);
      const fail = results.length - succeeded.length;

      if (succeeded.length > 0) {
        patchCacheMany(succeeded, status);
        const alert = statusAlertMessage(status, succeeded.length, fail);
        showAppAlert({ title: alert.title, message: alert.message });
      } else {
        const firstErr = results.find((r) => !r.ok);
        showAppAlert({
          title: "Lỗi",
          message:
            firstErr && !firstErr.ok
              ? firstErr.error
              : "Không cập nhật được trạng thái",
        });
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeeded.forEach((id) => next.delete(id));
        return next;
      });
    } finally {
      if (!isBulk) {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
      }
      setBulkLoading(null);
      void qc.invalidateQueries({ queryKey: ["guard-open-requests"] });
      void qc.invalidateQueries({ queryKey: ["guard-notifications"] });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableRows.map((r) => r.id)));
  };

  const openSos = (r: SecurityRequest) => {
    setSelectedSos(toOpenSosRow(r));
    setDrawerOpen(true);
  };

  const isLoadingAction = (id: string, status: ActionStatus) =>
    loadingKeys.has(actionKey(id, status)) || bulkLoading === status;

  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: "Tất cả", count: allRows.length },
    { key: "sos", label: "SOS khẩn cấp", count: sosRows.length },
    { key: "other", label: "Yêu cầu khác", count: allRows.length - sosRows.length },
  ];

  const bottomPad = Math.max(insets.bottom, 16) + (selectedIds.size > 0 ? 72 : 8);

  return (
    <View className="flex-1 bg-background">
      <SubHeader
        title="YÊU CẦU CƯ DÂN"
        right={
          <View className="flex-row items-center gap-1">
            {selectableRows.length > 0 ? (
              <TouchableOpacity onPress={toggleSelectAll} className="px-2 py-1">
                <Text className="text-xs font-semibold text-primary">
                  {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => refetch()} disabled={isFetching} className="p-2">
              <RefreshCw size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
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

        <View style={filterStyles.row}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  filterStyles.chip,
                  active
                    ? {
                        backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.12)",
                        borderColor: colors.brand,
                      }
                    : {
                        backgroundColor: isDark ? colors.card : "#FFFFFF",
                        borderColor: isDark ? colors.cardBorder : "rgba(15, 23, 42, 0.12)",
                      },
                ]}
              >
                <Text
                  style={[
                    filterStyles.chipText,
                    { color: active ? colors.brand : isDark ? colors.muted : "#475569" },
                  ]}
                >
                  {f.label}
                  {typeof f.count === "number" ? ` (${f.count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
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
            const checked = selectedIds.has(r.id);
            const claimLoading = isLoadingAction(r.id, "in_progress");
            const resolveLoading = isLoadingAction(r.id, "resolved");

            return (
              <View
                key={r.id}
                className={`rounded-2xl p-4 mb-3 border shadow-sm ${
                  checked
                    ? "border-primary bg-primary/5"
                    : isSos
                      ? "bg-red-500/8 border-red-400/60"
                      : "bg-card border-border"
                }`}
              >
                <View className="flex-row justify-between items-start gap-2">
                  {!isSos ? (
                    <Pressable
                      onPress={() => toggleSelect(r.id)}
                      hitSlop={8}
                      className="pt-0.5 pr-2"
                    >
                      {checked ? (
                        <CheckSquare size={22} color={colors.brand} />
                      ) : (
                        <Square size={22} color={colors.muted} />
                      )}
                    </Pressable>
                  ) : null}
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
                        <BulkActionButton
                          label="Tiếp nhận"
                          variant="primary"
                          compact
                          loading={claimLoading}
                          disabled={claimLoading || resolveLoading || bulkLoading !== null}
                          brandColor={colors.brand}
                          isDark={isDark}
                          onPress={() => void runStatusUpdate([r.id], "in_progress")}
                        />
                      )}
                      <BulkActionButton
                        label="Hoàn thành"
                        variant="outline"
                        compact
                        loading={resolveLoading}
                        disabled={claimLoading || resolveLoading || bulkLoading !== null}
                        brandColor={colors.brand}
                        isDark={isDark}
                        onPress={() => void runStatusUpdate([r.id], "resolved")}
                      />
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {selectedIds.size > 0 ? (
        <View
          style={[
            bulkStyles.bar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: isDark ? colors.card : "#FFFFFF",
              borderTopColor: isDark ? colors.cardBorder : "rgba(15, 23, 42, 0.1)",
            },
          ]}
        >
          <Text style={[bulkStyles.count, { color: colors.muted }]}>
            Đã chọn {selectedIds.size}
          </Text>
          <View style={bulkStyles.actions}>
            {selectedClaimable.length > 0 ? (
              <BulkActionButton
                label={`Tiếp nhận (${selectedClaimable.length})`}
                variant="primary"
                loading={bulkLoading === "in_progress"}
                disabled={bulkLoading !== null}
                brandColor={colors.brand}
                isDark={isDark}
                onPress={() =>
                  void runStatusUpdate(
                    selectedClaimable.map((r) => r.id),
                    "in_progress",
                  )
                }
              />
            ) : null}
            {selectedResolvable.length > 0 ? (
              <BulkActionButton
                label={`Hoàn thành (${selectedResolvable.length})`}
                variant="outline"
                loading={bulkLoading === "resolved"}
                disabled={bulkLoading !== null}
                brandColor={colors.brand}
                isDark={isDark}
                onPress={() =>
                  void runStatusUpdate(
                    selectedResolvable.map((r) => r.id),
                    "resolved",
                  )
                }
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <SosTicketDrawer
        row={selectedSos}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  );
}

function BulkActionButton({
  label,
  variant,
  loading,
  disabled,
  brandColor,
  isDark,
  onPress,
  compact,
}: {
  label: string;
  variant: "primary" | "outline";
  loading: boolean;
  disabled: boolean;
  brandColor: string;
  isDark: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        bulkStyles.actionBtn,
        compact && bulkStyles.actionBtnCompact,
        primary
          ? { backgroundColor: brandColor }
          : {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
              borderWidth: 1.5,
              borderColor: brandColor,
            },
        (disabled || loading) && { opacity: 0.55 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "#FFFFFF" : brandColor} size="small" />
      ) : (
        <Text
          style={[
            bulkStyles.actionText,
            { color: primary ? "#FFFFFF" : isDark ? "#FFFFFF" : brandColor },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const filterStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

const bulkStyles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  count: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionBtnCompact: {
    minHeight: 32,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
