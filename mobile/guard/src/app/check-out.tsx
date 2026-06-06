import React, { useEffect, useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Button } from "@mobile/components/ui/Button";
import { SubHeader } from "@mobile/components/SubHeader";
import { LogOut } from "lucide-react-native";
import { checkOutShift } from "@guard/api/guard-shifts";

export default function CheckOutScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError("Cần quyền truy cập vị trí để check-out.");
        setLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
        });
      } catch {
        setGeoError("Không thể lấy vị trí");
      }
      setLoading(false);
    })();
  }, []);

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await checkOutShift({ location: coords ?? undefined });
      Alert.alert("Thành công", "Đã kết thúc ca trực!", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (e) {
      Alert.alert("Lỗi", (e as Error).message || "Không kết thúc ca được");
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
          {loading ? (
            <ActivityIndicator size="small" className="mt-4" />
          ) : coords ? (
            <View className="items-center mb-6 mt-4">
              <Text className="text-muted-foreground mb-1">Vị trí hiện tại:</Text>
              <Text className="font-mono bg-muted px-3 py-1 rounded text-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            </View>
          ) : (
            <Text className="text-red-500 my-4">{geoError ?? "Không thể lấy vị trí"}</Text>
          )}
          <Button
            className="w-full h-12 mt-4 bg-red-500"
            onPress={handleCheckOut}
            isLoading={checkingOut}
            disabled={loading}
          >
            Xác nhận Kết thúc
          </Button>
        </View>
      </View>
    </View>
  );
}
