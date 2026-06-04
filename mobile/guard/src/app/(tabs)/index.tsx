import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Shield, Bell, LogIn, LogOut, MapPin, AlertTriangle, Users } from 'lucide-react-native';
import { Link } from 'expo-router';

export default function DashboardScreen() {
  const unread = 2; // Giả lập số thông báo
  const openRequests = 1; // Giả lập số yêu cầu
  const fullName = "Nguyễn Văn Bảo Vệ";
  const initials = "NV";

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Brand header */}
      <View className="px-5 pt-10 pb-4 flex-row items-start justify-between bg-white">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-2xl bg-blue-600 items-center justify-center shadow-sm">
            <Shield size={20} color="white" />
          </View>
          <View>
            <Text className="text-[15px] font-bold tracking-wide text-foreground">BẢO VỆ</Text>
            <Text className="text-[10px] text-gray-500 uppercase tracking-wider">
              STOS Residence
            </Text>
          </View>
        </View>
        <Link href="/(tabs)/notifications" asChild>
          <TouchableOpacity className="relative h-10 w-10 rounded-full bg-gray-100 border border-border items-center justify-center">
            <Bell size={18} color="#374151" />
            {unread > 0 && (
              <View className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[9px] font-bold">{unread > 9 ? "9+" : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Link>
      </View>

      {/* Profile */}
      <View className="px-5 mt-4">
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-blue-700 font-bold text-base">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500">Xin chào,</Text>
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>{fullName}</Text>
            <Text className="text-[11px] text-gray-500">Ca sáng: 06:00 - 14:00</Text>
            <View className="flex-row items-center mt-1">
              <View className="h-2 w-2 rounded-full bg-green-500 mr-1.5" />
              <Text className="text-[11px] text-green-600 font-medium">Đang làm việc</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action grid */}
      <View className="px-5 mt-6 flex-row flex-wrap justify-between">
        <Link href="/check-in" asChild>
          <TouchableOpacity className="w-[48%] bg-green-500 rounded-3xl p-4 shadow-sm items-center justify-center min-h-[120px] mb-4">
            <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-2">
              <LogIn size={24} color="white" />
            </View>
            <Text className="text-sm font-bold text-white tracking-wide">VÀO CA</Text>
            <Text className="text-[11px] text-white/80 mt-0.5">Check-in</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity className="w-[48%] bg-rose-500 rounded-3xl p-4 shadow-sm items-center justify-center min-h-[120px] mb-4" onPress={() => {}}>
          <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-2">
            <LogOut size={24} color="white" />
          </View>
          <Text className="text-sm font-bold text-white tracking-wide">KẾT THÚC CA</Text>
          <Text className="text-[11px] text-white/80 mt-0.5">Check-out</Text>
        </TouchableOpacity>

        <Link href="/(tabs)/patrol" asChild>
          <TouchableOpacity className="w-[48%] bg-blue-500 rounded-3xl p-4 shadow-sm items-center justify-center min-h-[120px] mb-4">
            <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-2">
              <MapPin size={24} color="white" />
            </View>
            <Text className="text-sm font-bold text-white tracking-wide">TUẦN TRA</Text>
            <Text className="text-[11px] text-white/80 mt-0.5">Điểm danh</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/incident" asChild>
          <TouchableOpacity className="w-[48%] bg-amber-500 rounded-3xl p-4 shadow-sm items-center justify-center min-h-[120px] mb-4">
            <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mb-2">
              <AlertTriangle size={24} color="white" />
            </View>
            <Text className="text-sm font-bold text-white tracking-wide">BÁO SỰ CỐ</Text>
            <Text className="text-[11px] text-white/80 mt-0.5">Gửi báo cáo</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Resident requests */}
      <View className="px-5 mt-2 mb-6">
        <Link href="/requests" asChild>
          <TouchableOpacity className="flex-row items-center rounded-3xl p-4 bg-purple-600 shadow-sm">
            <View className="h-12 w-12 rounded-2xl bg-white/20 items-center justify-center mr-4">
              <Users size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-white tracking-wide">YÊU CẦU CƯ DÂN</Text>
              <Text className="text-[12px] text-white/80">
                {openRequests > 0
                  ? `${openRequests} yêu cầu đang mở · Xem & xử lý`
                  : "Xem & xử lý"}
              </Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
