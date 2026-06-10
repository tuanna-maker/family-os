import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@mobile/components/ui/Button";
import { SubHeader } from "@mobile/components/SubHeader";
import { LogOut, AlertTriangle } from "lucide-react-native";
import { checkOutShift, getActiveShift } from "@guard/api/guard-shifts";
import { invalidateShiftQueries, resolveGuardLocation, type GuardCoords } from "@mobile/utils/guardGeo";
import { shiftLabel, shiftTimeRange } from "@mobile/utils/guardFormat";

export default function CheckOutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [coords, setCoords] = useState<GuardCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const { data: activeShift, isLoading: shiftLoading } = useQuery({
    queryKey: ["guard-active-shift"],
    queryFn: () => getActiveShift(),
  });

  const onDuty = activeShift?.status === "checked_in";

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

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="KẾT THÚC CA" />
      <View className="flex-1 p-6 items-center justify-center">
        <View className="w-full bg-card rounded-2xl p-6 shadow-sm border border-border items-center">
          <View className="h-16 w-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <LogOut size={32} color="#ef4444" />
          </View>
          <Text className="text-2xl font-bold mb-2 text-foreground">Check-out Ca trực</Text>

          {onDuty && activeShift ? (
            <Text className="text-sm text-muted-foreground text-center mb-2">
              {shiftLabel(activeShift.shift_type)} · {shiftTimeRange(activeShift.shift_type)}
            </Text>
          ) : null}

          {!onDuty && !shiftLoading ? (
            <View className="items-center my-4 px-2">
              <AlertTriangle size={28} color="#f59e0b" />
              <Text className="text-amber-600 text-center mt-2">Bạn chưa vào ca trực.</Text>
            </View>
          ) : loading ? (
            <Text className="text-muted-foreground mt-4">Đang lấy vị trí…</Text>
          ) : coords ? (
            <View className="items-center mb-6 mt-4">
              <Text className="text-muted-foreground mb-1">Vị trí hiện tại:</Text>
              <Text className="font-mono bg-muted px-3 py-1 rounded text-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            </View>
          ) : (
            <Text className="text-amber-600 my-4 text-center px-2">{geoError}</Text>
          )}

          <Button
            className="w-full h-12 mt-4 bg-red-500"
            onPress={handleCheckOut}
            isLoading={checkingOut || shiftLoading}
            disabled={checkingOut || shiftLoading || !onDuty}
          >
            Xác nhận Kết thúc
          </Button>
        </View>
      </View>
    </View>
  );
}
