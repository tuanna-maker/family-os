import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, QrCode, Keyboard } from "lucide-react-native";
import { useRouter } from "expo-router";
import { SubHeader } from "@mobile/components/SubHeader";
import { Button } from "@mobile/components/ui/Button";
import {
  getActiveShift,
  listPatrolLogs,
  logPatrolCheckpoint,
} from "@guard/api/guard-shifts";
import { shiftLabel } from "@mobile/utils/guardFormat";
import { resolveGuardLocation, type GuardCoords } from "@mobile/utils/guardGeo";
import { useTheme } from "@mobile/theme/themeStore";

type ScanMethod = "qr" | "manual";

export default function PatrolScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [method, setMethod] = useState<ScanMethod>("qr");
  const [coords, setCoords] = useState<GuardCoords | null>(null);

  const shiftQ = useQuery({ queryKey: ["guard-active-shift"], queryFn: () => getActiveShift() });
  const logsQ = useQuery({
    queryKey: ["patrol-logs", "today"],
    queryFn: () => listPatrolLogs({ scope: "today" }),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    (async () => {
      const { coords: c } = await resolveGuardLocation();
      setCoords(c);
    })();
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
      Alert.alert("Thành công", `Đã ghi nhận điểm ${code.trim()}`);
      setCode("");
      setRouteCode("");
      qc.invalidateQueries({ queryKey: ["patrol-logs"] });
    },
    onError: (e: Error) => Alert.alert("Lỗi", e.message || "Không ghi nhận được"),
  });

  const switchMethod = (next: ScanMethod) => {
    setMethod(next);
    setCode("");
    setRouteCode("");
  };

  const onDuty = shiftQ.data?.status === "checked_in";
  const logs = logsQ.data ?? [];
  const uniquePoints = new Set(logs.map((l) => l.checkpoint_code)).size;

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="TUẦN TRA" />
      <ScrollView className="flex-1">
        <View className="px-5 mt-4">
          <Text
            className={`text-sm font-semibold ${onDuty ? "text-green-600" : "text-amber-600"}`}
          >
            {onDuty
              ? `Đang trong ca · ${shiftLabel(shiftQ.data!.shift_type)}`
              : "Chưa vào ca — vui lòng check-in trước khi tuần tra"}
          </Text>
          <View className="mt-4 rounded-2xl bg-card border border-border p-4">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-sm">Hôm nay</Text>
              <Text className="font-semibold text-sm text-foreground">
                {logs.length} lượt · {uniquePoints} điểm
              </Text>
            </View>
            {coords ? (
              <Text className="mt-2 text-[11px] text-muted-foreground">
                GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="px-5 mt-5">
          <Text className="text-xs font-semibold text-muted-foreground mb-3 uppercase">
            Phương thức ghi nhận
          </Text>

          <View className="flex-row gap-2 mb-4">
            {(
              [
                { k: "qr" as const, label: "Quét QR", icon: QrCode, hint: "Dùng camera quét mã tại điểm" },
                { k: "manual" as const, label: "Thủ công", icon: Keyboard, hint: "Nhập mã điểm bằng tay" },
              ] as const
            ).map((m) => {
              const active = method === m.k;
              return (
                <TouchableOpacity
                  key={m.k}
                  onPress={() => switchMethod(m.k)}
                  className={`flex-1 rounded-2xl border p-3 ${
                    active ? "bg-brand/15 border-brand" : "bg-card border-border"
                  }`}
                >
                  <View className="flex-row items-center gap-2 mb-1">
                    <m.icon size={18} color={active ? colors.brand : colors.muted} />
                    <Text
                      className={`text-sm font-bold ${active ? "text-brand" : "text-foreground"}`}
                    >
                      {m.label}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-muted-foreground leading-4">{m.hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="rounded-2xl bg-card border border-border p-4">
            {method === "qr" ? (
              <>
                <Text className="text-sm text-muted-foreground mb-3">
                  Mở camera và quét mã QR dán tại điểm tuần tra. Mã sẽ được ghi nhận tự động.
                </Text>
                <Button
                  className="w-full"
                  onPress={() => router.push("/qr-scanner")}
                  disabled={!onDuty}
                >
                  <View className="flex-row items-center gap-2">
                    <QrCode size={18} color="white" />
                    <Text className="text-white font-semibold">Mở camera quét QR</Text>
                  </View>
                </Button>
                {!onDuty ? (
                  <Text className="text-xs text-amber-600 mt-3 text-center">
                    Cần vào ca trước khi quét điểm tuần tra
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text className="text-sm text-muted-foreground mb-3">
                  Nhập mã điểm in trên bảng tên hoặc theo danh sách tuyến tuần tra.
                </Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="Mã điểm (VD: CP-A1)"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  className="w-full h-12 rounded-xl bg-muted/50 border border-border px-4 text-sm mb-2 text-foreground"
                />
                <TextInput
                  value={routeCode}
                  onChangeText={setRouteCode}
                  placeholder="Mã tuyến (tuỳ chọn)"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  className="w-full h-12 rounded-xl bg-muted/50 border border-border px-4 text-sm mb-4 text-foreground"
                />
                <Button
                  onPress={() => submit.mutate()}
                  isLoading={submit.isPending}
                  disabled={!onDuty || !code.trim()}
                  className="w-full"
                >
                  GHI NHẬN ĐIỂM
                </Button>
                {!onDuty ? (
                  <Text className="text-xs text-amber-600 mt-3 text-center">
                    Cần vào ca trước khi ghi nhận điểm
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View className="px-5 mt-6 mb-10">
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
                  {l.route_code ? (
                    <Text className="text-[11px] text-muted-foreground">Tuyến {l.route_code}</Text>
                  ) : null}
                </View>
                <View className="items-end">
                  <Text className="text-[11px] text-muted-foreground">
                    {new Date(l.scanned_at).toLocaleTimeString("vi-VN", { hour12: false })}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground uppercase">{l.scan_method}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
