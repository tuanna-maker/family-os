import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Button } from "@mobile/components/ui/Button";
import { logPatrolCheckpoint } from "@guard/api/guard-shifts";

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-background">
        <Text className="text-lg text-center mb-4">Cần cấp quyền Camera để quét mã tuần tra</Text>
        <Button onPress={requestPermission}>Cấp quyền Camera</Button>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || submitting) return;
    setScanned(true);
    setSubmitting(true);
    try {
      let location: { lat: number; lng: number; accuracy?: number } | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        location = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
        };
      }
      await logPatrolCheckpoint({
        checkpoint_code: data.trim(),
        scan_method: "qr",
        location,
      });
      showAppAlert({
        title: "Quét thành công",
        message: `Đã ghi nhận điểm: ${data}`,
        buttons: [
          { text: "Quét tiếp", onPress: () => setScanned(false) },
          { text: "Đóng", onPress: () => router.back() },
        ],
      });
    } catch (e) {
      showAppAlert({
        title: "Lỗi",
        message: (e as Error).message || "Không ghi nhận được",
        buttons: [
          { text: "Thử lại", onPress: () => setScanned(false) },
          { text: "Đóng", onPress: () => router.back() },
        ],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        style={StyleSheet.absoluteFillObject}
      >
        <View className="flex-1 bg-transparent flex-row justify-center mt-[15%]">
          <Text className="text-white text-lg font-bold">Hướng camera vào mã QR</Text>
        </View>
        <View className="absolute bottom-10 w-full px-6">
          <Button variant="secondary" onPress={() => router.back()}>
            Hủy quét
          </Button>
        </View>
      </CameraView>
    </View>
  );
}
