import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '@/components/ui/Button';
import { MapPin } from 'lucide-react-native';

export default function CheckInScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập vị trí để check-in.');
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    })();
  }, []);

  const handleCheckIn = async () => {
    if (!location) return;
    setCheckingIn(true);
    // Giả lập gọi API Supabase lưu tọa độ
    setTimeout(() => {
      setCheckingIn(false);
      Alert.alert('Thành công', 'Đã check-in ca trực!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }, 1500);
  };

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <View className="w-full bg-white rounded-2xl p-6 shadow-sm border border-border items-center">
        <View className="h-16 w-16 bg-blue-100 rounded-full items-center justify-center mb-4">
          <MapPin size={32} color="#2563eb" />
        </View>
        <Text className="text-2xl font-bold mb-2 text-foreground">Check-in Ca trực</Text>
        
        {loading ? (
          <ActivityIndicator size="small" className="mt-4" />
        ) : location ? (
          <View className="items-center mb-6 mt-4">
            <Text className="text-gray-500 mb-1">Vị trí hiện tại:</Text>
            <Text className="font-mono bg-gray-100 px-3 py-1 rounded">
              {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
            </Text>
          </View>
        ) : (
          <Text className="text-red-500 my-4">Không thể lấy vị trí</Text>
        )}

        <Button
          className="w-full h-12 mt-4"
          onPress={handleCheckIn}
          isLoading={checkingIn}
          disabled={!location}
        >
          Xác nhận Check-in
        </Button>
      </View>
    </View>
  );
}
