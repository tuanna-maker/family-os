import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

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

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    // Xử lý dữ liệu QR
    Alert.alert('Quét thành công', `Mã điểm tuần tra: ${data}`, [
      {
        text: 'Tiếp tục',
        onPress: () => setScanned(false),
      },
      {
        text: 'Đóng',
        onPress: () => router.back(),
        style: 'cancel',
      }
    ]);
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
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
