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
import { AlertCircle, Check, QrCode, MapPin, Keyboard } from "lucide-react-native";
import { Link } from "expo-router";
import * as Location from "expo-location";
import { SubHeader } from "@mobile/components/SubHeader";
import { Button } from "@mobile/components/ui/Button";
import {
  getActiveShift,
  listPatrolLogs,
  logPatrolCheckpoint,
} from "@guard/api/guard-shifts";

type Coords = { lat: number; lng: number; accuracy?: number } | null;

export default function PatrolScreen() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [method, setMethod] = useState<"qr" | "nfc" | "manual">("qr");
  const [coords, setCoords] = useState<Coords>(null);

  const shiftQ = useQuery({ queryKey: ["guard-active-shift"], queryFn: () => getActiveShift() });
  const logsQ = useQuery({
    queryKey: ["patrol-logs", "today"],
    queryFn: () => listPatrolLogs({ scope: "today" }),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      });
    })();
  }, []);

  const submit = useMutation({
    mutationFn: async (m: "qr" | "nfc" | "manual") => {
      if (!code.trim()) throw new Error("Nhập mã điểm tuần tra");
      return logPatrolCheckpoint({
        checkpoint_code: code.trim(),
        route_code: routeCode.trim() || undefined,
        scan_method: m,
        location: coords ?? undefined,
      });
    },
    onSuccess: () => {
      Alert.alert("Thành công", `Đã ghi nhận điểm ${code.trim()}`);
      setCode("");
      qc.invalidateQueries({ queryKey: ["patrol-logs"] });
    },
    onError: (e: Error) => Alert.alert("Lỗi", e.message || "Không ghi nhận được"),
  });

  const logs = logsQ.data ?? [];
  const uniquePoints = new Set(logs.map((l) => l.checkpoint_code)).size;

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="TUẦN TRA" />
      <ScrollView className="flex-1">
        <View className="px-5 mt-4">
          <Text className="text-green-600 text-sm font-semibold">
            {shiftQ.data
              ? `Ca đang mở · ${shiftQ.data.shift_type}`
              : "Chưa có ca trực đang mở"}
          </Text>
          <View className="mt-4 rounded-2xl bg-card border border-border p-4">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-sm">Hôm nay</Text>
              <Text className="font-semibold text-sm">
                {logs.length} lượt · {uniquePoints} điểm
              </Text>
            </View>
            {coords && (
              <Text className="mt-2 text-[11px] text-muted-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            )}
          </View>
        </View>

        <View className="px-5 mt-5">
          <Text className="text-xs font-semibold text-muted-foreground mb-2">Quét / nhập điểm</Text>
          <Link href="/qr-scanner" asChild>
            <Button className="w-full mb-3">
              <View className="flex-row items-center gap-2">
                <QrCode size={18} color="white" />
                <Text className="text-white font-semibold">Mở Camera Quét Mã</Text>
              </View>
            </Button>
          </Link>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Mã điểm (VD: CP-A1)"
            className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm mb-2"
          />
          <TextInput
            value={routeCode}
            onChangeText={setRouteCode}
            placeholder="Mã tuyến (tuỳ chọn)"
            className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm mb-3"
          />
          <View className="flex-row gap-2 mb-3">
            {(
              [
                { k: "qr" as const, label: "QR", icon: QrCode },
                { k: "manual" as const, label: "Thủ công", icon: Keyboard },
              ] as const
            ).map((m) => (
              <TouchableOpacity
                key={m.k}
                onPress={() => setMethod(m.k)}
                className={`flex-1 h-11 rounded-xl border items-center justify-center flex-row gap-1 ${
                  method === m.k ? "bg-blue-600 border-blue-600" : "bg-card border-border"
                }`}
              >
                <m.icon size={16} color={method === m.k ? "white" : "#374151"} />
                <Text className={`text-xs font-semibold ${method === m.k ? "text-white" : ""}`}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button
            onPress={() => submit.mutate(method)}
            isLoading={submit.isPending}
            className="w-full"
          >
            GHI NHẬN ĐIỂM
          </Button>
        </View>

        <View className="px-5 mt-6 mb-10">
          <Text className="text-xs font-semibold text-muted-foreground mb-2">Nhật ký hôm nay</Text>
          {logsQ.isLoading ? (
            <ActivityIndicator />
          ) : logs.length === 0 ? (
            <View className="rounded-2xl bg-card border border-border p-4 flex-row items-center gap-2">
              <AlertCircle size={16} color="#9ca3af" />
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
                  <Text className="text-sm font-semibold">{l.checkpoint_code}</Text>
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
