import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Circle, QrCode, Keyboard } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Button } from "@mobile/components/ui/Button";
import {
  getActiveShift,
  listPatrolLogs,
  logPatrolCheckpoint,
} from "@guard/api/guard-shifts";
import { shiftLabel, shiftTimeRange } from "@mobile/utils/guardFormat";
import { resolveGuardLocation, type GuardCoords } from "@mobile/utils/guardGeo";
import { useTheme } from "@mobile/theme/themeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabScrollPadding } from "@mobile/hooks/useTabScrollPadding";

const PATROL_TARGET = 5;
const DEFAULT_CHECKPOINTS = ["Sảnh chính", "Hầm xe B1", "Tầng 15", "Sân thượng", "Cổng phụ"];

type ScanMethod = "qr" | "manual";

export function PatrolTabContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabPad = useTabScrollPadding();
  const [code, setCode] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [method, setMethod] = useState<ScanMethod>("qr");
  const [coords, setCoords] = useState<GuardCoords | null>(null);

  const shiftQ = useQuery({ queryKey: ["guard-active-shift"], queryFn: () => getActiveShift() });
  const logsQ = useQuery({
    queryKey: ["patrol-logs", "today"],
    queryFn: () => listPatrolLogs({ scope: "today" }),
    staleTime: 30_000,
  });

  useEffect(() => {
    void resolveGuardLocation().then(({ coords: c }) => setCoords(c));
  }, []);

  const submit = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error("Nhập mã điểm tuần tra");
      return logPatrolCheckpoint({
        checkpoint_code: code.trim(),
        route_code: routeCode.trim() || undefined,
        scan_method: method,
        location: coords ?? undefined,
      });
    },
    onSuccess: () => {
      showAppAlert({ title: "Thành công", message: `Đã ghi nhận điểm ${code.trim()}` });
      setCode("");
      setRouteCode("");
      qc.invalidateQueries({ queryKey: ["patrol-logs"] });
    },
    onError: (e: Error) =>
      showAppAlert({ title: "Lỗi", message: e.message || "Không ghi nhận được" }),
  });

  const onDuty = shiftQ.data?.status === "checked_in";
  const logs = logsQ.data ?? [];
  const scannedSet = useMemo(() => new Set(logs.map((l) => l.checkpoint_code)), [logs]);
  const progress = Math.min(PATROL_TARGET, scannedSet.size);
  const pct = Math.round((progress / PATROL_TARGET) * 100);

  const checkpointRows = DEFAULT_CHECKPOINTS.map((name) => {
    const hit = logs.find((l) => l.checkpoint_code === name);
    return { name, hit };
  });

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={tabPad}>
      <View
        className="px-5 pb-3 border-b border-border"
        style={{ paddingTop: Math.max(insets.top + 12, 48) }}
      >
        <Text className="text-xl font-bold text-foreground">TUẦN TRA</Text>
        {shiftQ.data ? (
          <Text className="text-sm text-muted-foreground mt-1">
            {shiftLabel(shiftQ.data.shift_type)} · {shiftTimeRange(shiftQ.data.shift_type)}
          </Text>
        ) : null}
      </View>

      <View className="px-5 mt-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-foreground">
            Tiến độ tuần tra {progress}/{PATROL_TARGET} điểm
          </Text>
          <Text className="text-sm font-bold text-brand">{pct}%</Text>
        </View>
        <View className="h-2 rounded-full bg-muted overflow-hidden">
          <View className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
        </View>
      </View>

      <View className="px-5 mt-5">
        {checkpointRows.map(({ name, hit }) => (
          <View
            key={name}
            className="flex-row items-center gap-3 py-3 border-b border-border/60"
          >
            {hit ? (
              <View className="h-6 w-6 rounded-full bg-green-500 items-center justify-center">
                <Check size={14} color="white" />
              </View>
            ) : (
              <Circle size={22} color={colors.muted} />
            )}
            <View className="flex-1">
              <Text className={`text-sm font-semibold ${hit ? "text-foreground" : "text-muted-foreground"}`}>
                {name}
              </Text>
              <Text className="text-[11px] text-muted-foreground mt-0.5">
                {hit
                  ? `Đã điểm danh · ${new Date(hit.scanned_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                  : "Chưa điểm danh"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="px-5 mt-4">
        <Text className="text-xs font-semibold text-muted-foreground mb-3 uppercase">
          Ghi nhận điểm
        </Text>
        <View className="flex-row gap-2 mb-4">
          {(
            [
              { k: "qr" as const, label: "Quét QR", icon: QrCode },
              { k: "manual" as const, label: "Thủ công", icon: Keyboard },
            ] as const
          ).map((m) => {
            const active = method === m.k;
            return (
              <TouchableOpacity
                key={m.k}
                onPress={() => {
                  setMethod(m.k);
                  setCode("");
                  setRouteCode("");
                }}
                className={`flex-1 rounded-2xl border p-3 flex-row items-center justify-center gap-2 ${
                  active ? "bg-brand/15 border-brand" : "bg-card border-border"
                }`}
              >
                <m.icon size={18} color={active ? colors.brand : colors.muted} />
                <Text className={`text-sm font-bold ${active ? "text-brand" : "text-foreground"}`}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {method === "qr" ? (
          <Button className="w-full h-14" onPress={() => router.push("/qr-scanner")} disabled={!onDuty}>
            <View className="flex-row items-center gap-2">
              <QrCode size={20} color="white" />
              <Text className="text-white font-bold text-base">QUÉT QR / CHECK ĐIỂM</Text>
            </View>
          </Button>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Mã điểm (VD: CP-A1)"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm mb-3 text-foreground"
            />
            <Button
              onPress={() => submit.mutate()}
              isLoading={submit.isPending}
              disabled={!onDuty || !code.trim()}
              className="w-full"
            >
              GHI NHẬN ĐIỂM
            </Button>
          </>
        )}
        {!onDuty ? (
          <Text className="text-xs text-amber-600 mt-3 text-center">
            Cần vào ca trước khi tuần tra
          </Text>
        ) : null}
      </View>

      <View className="px-5 mt-6 mb-6">
        <Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
          Nhật ký hôm nay
        </Text>
        {logsQ.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : logs.length === 0 ? (
          <View className="rounded-2xl bg-card border border-border p-4 flex-row items-center gap-2">
            <AlertCircle size={16} color={colors.muted} />
            <Text className="text-sm text-muted-foreground">Chưa có lượt tuần tra nào hôm nay</Text>
          </View>
        ) : (
          logs.map((l) => (
            <View
              key={l.id}
              className="flex-row items-center gap-3 p-3.5 bg-card border border-border rounded-xl mb-2"
            >
              <View className="h-6 w-6 rounded-full bg-green-500 items-center justify-center">
                <Check size={14} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">{l.checkpoint_code}</Text>
              </View>
              <Text className="text-[11px] text-muted-foreground">
                {new Date(l.scanned_at).toLocaleTimeString("vi-VN", { hour12: false })}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
