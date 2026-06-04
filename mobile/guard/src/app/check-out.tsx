import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '@/components/ui/Button';
import { LogOut, ChevronLeft } from 'lucide-react-native';

export default function CheckOutScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập vị trí để check-out.');
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    })();
  }, []);

  const handleCheckOut = async () => {
    if (!location) return;
    setCheckingOut(true);
    // Giả lập gọi API Supabase lưu tọa độ
    setTimeout(() => {
      setCheckingOut(false);
      Alert.alert('Thành công', 'Đã kết thúc ca trực!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    }, 1500);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-12 pb-4 bg-white flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold flex-1 text-foreground">KẾT THÚC CA</Text>
      </View>

      <View className="flex-1 p-6 items-center justify-center">
        <View className="w-full bg-white rounded-2xl p-6 shadow-sm border border-border items-center">
          <View className="h-16 w-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <LogOut size={32} color="#ef4444" />
          </View>
          <Text className="text-2xl font-bold mb-2 text-foreground">Check-out Ca trực</Text>
          
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
            className="w-full h-12 mt-4 bg-red-500"
            onPress={handleCheckOut}
            isLoading={checkingOut}
            disabled={!location}
          >
            Xác nhận Kết thúc
          </Button>
        </View>
      </View>
    </View>
  );
}
