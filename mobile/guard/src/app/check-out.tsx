import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SubHeader } from "@mobile/components/SubHeader";
import { MapPin, AlertTriangle, Check } from "lucide-react-native";
import { checkOutShift, getActiveShift } from "@guard/api/guard-shifts";
import { invalidateShiftQueries, resolveGuardLocation, type GuardCoords } from "@mobile/utils/guardGeo";
import { shiftLabel, shiftTimeRange } from "@mobile/utils/guardFormat";
import { useTheme } from "@mobile/theme/themeStore";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const CHECKLIST = [
  "Không còn sự cố chờ xử lý",
  "Đã bàn giao chìa khoá / bộ đàm",
  "Đã hoàn thành tuần tra",
  "Không còn yêu cầu cư dân đang mở",
] as const;

export default function CheckOutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const now = useLiveClock();
  const [coords, setCoords] = useState<GuardCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [checks, setChecks] = useState<boolean[]>([true, true, true, true]);

  const { data: activeShift, isLoading: shiftLoading } = useQuery({
    queryKey: ["guard-active-shift"],
    queryFn: () => getActiveShift(),
  });

  const onDuty = activeShift?.status === "checked_in";

  useEffect(() => {
    void (async () => {
      const { coords: c, error } = await resolveGuardLocation();
      setCoords(c);
      setGeoError(error);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (shiftLoading) return;
    if (!onDuty) {
      showAppAlert({
        title: "Chưa vào ca",
        message: "Bạn chưa check-in ca trực nên không thể kết thúc ca.",
        buttons: [{ text: "OK", onPress: () => router.back() }],
      });
    }
  }, [shiftLoading, onDuty, router]);

  const handleCheckOut = async () => {
    if (!onDuty) {
      showAppAlert({ title: "Chưa vào ca", message: "Bạn chưa check-in ca trực." });
      return;
    }
    if (!checks.every(Boolean)) {
      showAppAlert({
        title: "Chưa hoàn tất",
        message: "Vui lòng xác nhận đủ các mục trong checklist trước khi kết thúc ca.",
      });
      return;
    }
    setCheckingOut(true);
    try {
      await checkOutShift({ location: coords ?? undefined });
      invalidateShiftQueries(qc);
      showAppAlert({
        title: "Thành công",
        message: "Đã kết thúc ca trực!",
        buttons: [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      });
    } catch (e) {
      showAppAlert({ title: "Lỗi", message: (e as Error).message || "Không kết thúc ca được" });
    } finally {
      setCheckingOut(false);
    }
  };

  const timeStr = now.toLocaleTimeString("vi-VN", { hour12: false });
  const dateStr = now.toLocaleDateString("vi-VN");

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="Kết thúc ca" back="/(tabs)" />
      <View className="flex-1 px-5 pt-4 pb-8">
        <View className="items-center mb-6">
          <View className="h-36 w-36 rounded-full border-2 border-red-400/50 items-center justify-center bg-card">
            <View className="h-28 w-28 rounded-full bg-red-500/10 items-center justify-center">
              <MapPin size={40} color="#ef4444" />
            </View>
          </View>
          {loading ? (
            <Text className="text-muted-foreground mt-4">Đang lấy vị trí…</Text>
          ) : coords ? (
            <Text className="text-muted-foreground mt-4 text-sm">Vị trí hiện tại đã ghi nhận</Text>
          ) : (
            <Text className="text-amber-600 mt-4 text-center px-4">{geoError}</Text>
          )}
          {onDuty && activeShift ? (
            <Text className="text-xs text-muted-foreground mt-2">
              {shiftLabel(activeShift.shift_type)} · {shiftTimeRange(activeShift.shift_type)}
            </Text>
          ) : null}
        </View>

        <View className="items-center mb-6">
          <Text className="text-4xl font-bold text-red-500 tracking-wider">{timeStr}</Text>
          <Text className="text-sm text-muted-foreground mt-1">{dateStr}</Text>
        </View>

        <Text className="text-base font-bold text-foreground mb-3">Xác nhận kết thúc ca</Text>
        <View className="rounded-2xl bg-card border border-border p-4 mb-6 gap-3">
          {CHECKLIST.map((label, i) => (
            <Pressable
              key={label}
              className="flex-row items-center gap-3"
              onPress={() =>
                setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
              }
            >
              <View
                className={`h-6 w-6 rounded-full items-center justify-center ${
                  checks[i] ? "bg-green-500" : "border-2 border-muted"
                }`}
              >
                {checks[i] ? <Check size={14} color="white" /> : null}
              </View>
              <Text className={`flex-1 text-sm ${checks[i] ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {!onDuty && !shiftLoading ? (
          <View className="items-center py-2 mb-4">
            <AlertTriangle size={28} color="#f59e0b" />
            <Text className="text-amber-600 text-center mt-2">Bạn chưa vào ca trực.</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => void handleCheckOut()}
          disabled={checkingOut || shiftLoading || !onDuty}
          className={`mt-auto rounded-2xl py-4 items-center ${onDuty ? "bg-red-500" : "bg-muted"}`}
          style={{ opacity: checkingOut || shiftLoading ? 0.7 : 1 }}
        >
          <Text className="text-white font-bold text-base uppercase tracking-wide">
            {checkingOut ? "Đang xử lý…" : "Xác nhận kết thúc ca"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
