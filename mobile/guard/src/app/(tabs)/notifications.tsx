import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Bell, ShieldAlert, CheckCircle, Clock } from 'lucide-react-native';

const NOTIFICATIONS = [
  { id: '1', title: 'Ca trực mới', message: 'Bạn được phân công vào ca sáng Tòa A', time: '10 phút trước', type: 'info', read: false },
  { id: '2', title: 'Yêu cầu cư dân', message: 'Có 2 yêu cầu chưa xử lý', time: '1 giờ trước', type: 'alert', read: true },
];

export default function NotificationsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-5 pt-12 pb-4 bg-white border-b border-border flex-row items-center justify-between">
        <Text className="text-xl font-bold text-foreground">Thông báo</Text>
        <TouchableOpacity>
          <Text className="text-sm font-medium text-blue-600">Đánh dấu đã đọc</Text>
        </TouchableOpacity>
      </View>

      <View className="p-4">
        {NOTIFICATIONS.map(n => (
          <TouchableOpacity key={n.id} className={`p-4 rounded-2xl mb-3 border ${n.read ? 'bg-white border-transparent' : 'bg-blue-50/50 border-blue-100'} shadow-sm`}>
            <View className="flex-row items-start">
              <View className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${n.type === 'alert' ? 'bg-red-100' : 'bg-blue-100'}`}>
                {n.type === 'alert' ? <ShieldAlert size={20} color="#ef4444" /> : <Bell size={20} color="#2563eb" />}
              </View>
              <View className="flex-1">
                <Text className={`text-base font-bold ${n.read ? 'text-gray-800' : 'text-foreground'}`}>{n.title}</Text>
                <Text className="text-sm text-gray-600 mt-0.5 leading-5">{n.message}</Text>
                <View className="flex-row items-center mt-2">
                  <Clock size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-400 ml-1">{n.time}</Text>
                </View>
              </View>
              {!n.read && <View className="h-2.5 w-2.5 bg-blue-500 rounded-full mt-2" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
