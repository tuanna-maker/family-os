import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Clock, Siren, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';

// Giả lập dữ liệu
const MOCK_REQUESTS = [
  { id: '1', type: 'sos', title: 'SOS khẩn cấp', location: 'Tầng 12 - Tòa A', time: '2 phút trước', status: 'open' },
  { id: '2', type: 'noise', title: 'Tiếng ồn', location: 'Căn 0504 - Tòa B', time: '15 phút trước', status: 'open' },
];

export default function RequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState(MOCK_REQUESTS);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleStatusUpdate = (id: string, newStatus: string) => {
    setRequests(requests.filter(r => r.id !== id));
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-12 pb-4 bg-white flex-row items-center border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold flex-1 text-foreground">YÊU CẦU CƯ DÂN</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={loading} className="p-2">
          <RefreshCw size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="mb-3 flex-row">
          <View className="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            <Text className="text-xs text-gray-700 font-medium">{requests.length} đang mở</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" className="mt-10" />
        ) : requests.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">Không có yêu cầu nào đang chờ xử lý.</Text>
        ) : (
          requests.map((r) => (
            <View key={r.id} className="bg-white rounded-2xl p-4 mb-3 border border-border shadow-sm">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    {r.type === 'sos' && <Siren size={16} color="#ef4444" />}
                    <Text className="text-sm font-bold text-foreground">{r.location}</Text>
                  </View>
                  <View className={`mt-1.5 self-start px-2 py-0.5 rounded-full ${r.type === 'sos' ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <Text className={`text-[11px] font-medium ${r.type === 'sos' ? 'text-red-700' : 'text-blue-700'}`}>
                      {r.title}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <View className="flex-row items-center">
                    <Clock size={12} color="#6b7280" />
                    <Text className="text-[11px] text-gray-500 ml-1">{r.time}</Text>
                  </View>
                  <Text className="text-[10px] text-gray-500 mt-1">Chờ xử lý</Text>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                {r.type === 'sos' ? (
                  <Button variant="outline" size="sm" className="h-8">Xem SOS</Button>
                ) : (
                  <>
                    <Button size="sm" className="h-8" onPress={() => handleStatusUpdate(r.id, 'in_progress')}>Tiếp nhận</Button>
                    <Button variant="outline" size="sm" className="h-8" onPress={() => handleStatusUpdate(r.id, 'resolved')}>Hoàn thành</Button>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
