import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { QrCode, MapPin } from 'lucide-react-native';

export default function PatrolScreen() {
  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-foreground mb-4">Tuần tra an ninh</Text>

      <View className="bg-white p-5 rounded-2xl shadow-sm border border-border mb-6">
        <View className="flex-row items-center mb-4">
          <View className="bg-blue-100 p-2 rounded-lg mr-3">
            <QrCode size={24} color="#2563eb" />
          </View>
          <View>
            <Text className="text-lg font-semibold text-foreground">Quét mã Điểm tuần tra</Text>
            <Text className="text-gray-500 text-sm">Hướng camera vào mã QR được dán tại các chốt</Text>
          </View>
        </View>

        <Link href="/qr-scanner" asChild>
          <Button className="w-full">
            Mở Camera Quét Mã
          </Button>
        </Link>
      </View>

      <Text className="text-lg font-semibold text-foreground mb-3">Lộ trình hôm nay</Text>
      
      {/* Timeline item */}
      <View className="flex-row mb-4">
        <View className="items-center mr-4">
          <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
            <MapPin size={16} color="#16a34a" />
          </View>
          <View className="w-0.5 h-12 bg-gray-200 mt-2" />
        </View>
        <View className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-border">
          <Text className="font-semibold text-foreground">Hầm B1 - Khu A</Text>
          <Text className="text-sm text-gray-500">Đã quét lúc 08:15</Text>
        </View>
      </View>

      {/* Timeline item */}
      <View className="flex-row mb-4">
        <View className="items-center mr-4">
          <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
            <MapPin size={16} color="#6b7280" />
          </View>
        </View>
        <View className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-border opacity-60">
          <Text className="font-semibold text-foreground">Hành lang tầng 12</Text>
          <Text className="text-sm text-gray-500">Chưa hoàn thành</Text>
        </View>
      </View>

    </ScrollView>
  );
}
