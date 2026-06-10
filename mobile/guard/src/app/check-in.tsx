import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@mobile/components/ui/Button";
import { SubHeader } from "@mobile/components/SubHeader";
import { MapPin, AlertTriangle } from "lucide-react-native";
import { checkInShift, getActiveShift } from "@guard/api/guard-shifts";
import { invalidateShiftQueries, resolveGuardLocation, type GuardCoords } from "@mobile/utils/guardGeo";
import { shiftLabel, shiftTimeRange } from "@mobile/utils/guardFormat";

export default function CheckInScreen() {
  const router = useRouter();
  const qc = useQueryClient();
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
    (async () => {
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

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="VÀO CA (CHECK-IN)" />
      <View className="flex-1 p-6 items-center justify-center">
        <View className="w-full bg-card rounded-2xl p-6 shadow-sm border border-border items-center">
          <View className="h-16 w-16 bg-blue-100 rounded-full items-center justify-center mb-4">
            <MapPin size={32} color="#2563eb" />
          </View>
          <Text className="text-2xl font-bold mb-2 text-foreground">Check-in Ca trực</Text>

          {canCheckIn && activeShift ? (
            <Text className="text-sm text-muted-foreground text-center mb-2">
              {shiftLabel(activeShift.shift_type)} · {shiftTimeRange(activeShift.shift_type)}
            </Text>
          ) : null}

          {noShiftToday ? (
            <View className="items-center my-4 px-2">
              <AlertTriangle size={28} color="#f59e0b" />
              <Text className="text-amber-600 text-center mt-2">
                Hôm nay bạn không có ca trực được phân công.
              </Text>
            </View>
          ) : loading ? (
            <Text className="text-muted-foreground mt-4">Đang lấy vị trí…</Text>
          ) : coords ? (
            <View className="items-center mb-6 mt-4">
              <Text className="text-green-600 font-semibold mb-2">Lấy vị trí thành công</Text>
              <Text className="font-mono bg-muted px-3 py-1 rounded text-sm text-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            </View>
          ) : (
            <Text className="text-amber-600 my-4 text-center px-2">{geoError}</Text>
          )}

          <Button
            className="w-full h-12 mt-4"
            onPress={handleCheckIn}
            isLoading={checkingIn || shiftLoading}
            disabled={checkingIn || shiftLoading || !canCheckIn}
          >
            Xác nhận Check-in
          </Button>
        </View>
      </View>
    </View>
  );
}
