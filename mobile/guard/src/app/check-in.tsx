import React, { useEffect, useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Button } from "@mobile/components/ui/Button";
import { SubHeader } from "@mobile/components/SubHeader";
import { MapPin } from "lucide-react-native";
import { checkInShift } from "@guard/api/guard-shifts";

export default function CheckInScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError("Cần quyền truy cập vị trí để check-in.");
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

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await checkInShift({ location: coords ?? undefined });
      Alert.alert(
        "Thành công",
        res.reused ? "Đã có ca đang mở" : "Đã check-in ca trực!",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert("Lỗi", (e as Error).message || "Không vào ca được");
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
          {loading ? (
            <ActivityIndicator size="small" className="mt-4" />
          ) : coords ? (
            <View className="items-center mb-6 mt-4">
              <Text className="text-green-600 font-semibold mb-2">Lấy vị trí thành công</Text>
              <Text className="font-mono bg-muted px-3 py-1 rounded text-sm text-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
            </View>
          ) : (
            <Text className="text-red-500 my-4">{geoError ?? "Không thể lấy vị trí"}</Text>
          )}
          <Button
            className="w-full h-12 mt-4"
            onPress={handleCheckIn}
            isLoading={checkingIn}
            disabled={loading}
          >
            Xác nhận Check-in
          </Button>
        </View>
      </View>
    </View>
  );
}
