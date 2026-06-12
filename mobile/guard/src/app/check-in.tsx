import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SubHeader } from "@mobile/components/SubHeader";
import { MapPin, AlertTriangle, Info } from "lucide-react-native";
import { checkInShift, getActiveShift } from "@guard/api/guard-shifts";
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

export default function CheckInScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const now = useLiveClock();
  const [coords, setCoords] = useState<GuardCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const { data: activeShift, isLoading: shiftLoading } = useQuery({
    queryKey: ["guard-active-shift"],
    queryFn: () => getActiveShift(),
  });

  const onDuty = activeShift?.status === "checked_in";
  const canCheckIn = activeShift?.status === "scheduled";
  const noShiftToday = !shiftLoading && !activeShift;

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
    if (onDuty) {
      showAppAlert({
        title: "Đã vào ca",
        message: "Bạn đang trong ca trực, không cần check-in lại.",
        buttons: [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      });
    } else if (noShiftToday) {
      showAppAlert({
        title: "Không có ca trực",
        message: "Hôm nay bạn không có ca trực được phân công. Vui lòng liên hệ quản lý an ninh.",
        buttons: [{ text: "OK", onPress: () => router.back() }],
      });
    }
  }, [shiftLoading, onDuty, noShiftToday, router]);

  const handleCheckIn = async () => {
    if (!canCheckIn) {
      showAppAlert({
        title: "Không thể vào ca",
        message: noShiftToday
          ? "Hôm nay bạn không có ca trực được phân công."
          : "Bạn đang trong ca hoặc đã kết thúc ca hôm nay.",
      });
      return;
    }
    setCheckingIn(true);
    try {
      const res = await checkInShift({ location: coords ?? undefined });
      invalidateShiftQueries(qc);
      showAppAlert({
        title: "Thành công",
        message: res.reused ? "Đã có ca đang mở" : "Đã check-in ca trực!",
        buttons: [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      });
    } catch (e) {
      showAppAlert({ title: "Lỗi", message: (e as Error).message || "Không vào ca được" });
    } finally {
      setCheckingIn(false);
    }
  };

  const timeStr = now.toLocaleTimeString("vi-VN", { hour12: false });
  const dateStr = now.toLocaleDateString("vi-VN");

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="Vào ca" back="/(tabs)" />
      <View className="flex-1 px-5 pt-4 pb-8">
        <View className="items-center mb-6">
          <View className="h-36 w-36 rounded-full border-2 border-brand/40 items-center justify-center bg-card">
            <View className="h-28 w-28 rounded-full bg-brand/10 items-center justify-center">
              <MapPin size={40} color={colors.brand} />
            </View>
          </View>
          {coords ? (
            <Text className="text-green-600 font-semibold mt-4 text-center">Lấy vị trí thành công</Text>
          ) : loading ? (
            <Text className="text-muted-foreground mt-4">Đang lấy vị trí…</Text>
          ) : (
            <Text className="text-amber-600 mt-4 text-center px-4">{geoError}</Text>
          )}
          <Text className="text-sm text-muted-foreground text-center mt-2 px-6">
            Sảnh chính · Tòa A
          </Text>
          {canCheckIn && activeShift ? (
            <Text className="text-xs text-muted-foreground mt-2">
              {shiftLabel(activeShift.shift_type)} · {shiftTimeRange(activeShift.shift_type)}
            </Text>
          ) : null}
        </View>

        <View className="items-center mb-6">
          <Text className="text-4xl font-bold text-green-500 tracking-wider">{timeStr}</Text>
          <Text className="text-sm text-muted-foreground mt-1">{dateStr}</Text>
        </View>

        <View className="rounded-2xl border border-brand/30 bg-brand/5 p-4 flex-row gap-3 mb-8">
          <Info size={20} color={colors.brand} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-sm text-foreground leading-5">
            Vui lòng đảm bảo bạn đang ở đúng vị trí làm việc trước khi xác nhận vào ca.
          </Text>
        </View>

        {noShiftToday ? (
          <View className="items-center py-4">
            <AlertTriangle size={28} color="#f59e0b" />
            <Text className="text-amber-600 text-center mt-2 px-4">
              Hôm nay bạn không có ca trực được phân công.
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => void handleCheckIn()}
          disabled={checkingIn || shiftLoading || !canCheckIn}
          className={`mt-auto rounded-2xl py-4 items-center ${canCheckIn ? "bg-green-600" : "bg-muted"}`}
          style={{ opacity: checkingIn || shiftLoading ? 0.7 : 1 }}
        >
          <Text className="text-white font-bold text-base uppercase tracking-wide">
            {checkingIn ? "Đang xử lý…" : "Xác nhận vào ca"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
