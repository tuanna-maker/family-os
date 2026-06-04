import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LogOut, User, Shield, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Đăng xuất', 
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        }
      }
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5 mt-6 items-center">
        <View className="h-24 w-24 rounded-full bg-blue-100 items-center justify-center mb-4">
          <User size={48} color="#2563eb" />
        </View>
        <Text className="text-xl font-bold text-foreground">Nguyễn Văn Bảo Vệ</Text>
        <Text className="text-gray-500 mt-1">nv.aninh@stos.vn</Text>
        
        <View className="mt-4 bg-blue-50 px-3 py-1 rounded-full flex-row items-center border border-blue-100">
          <Shield size={14} color="#2563eb" className="mr-1.5" />
          <Text className="text-blue-700 text-xs font-semibold uppercase tracking-wider">Đội an ninh Tòa A</Text>
        </View>
      </View>

      <View className="px-5 mt-4">
        <Text className="text-sm font-semibold text-gray-500 mb-3 ml-2 uppercase">Thiết lập chung</Text>
        
        <View className="bg-white rounded-2xl border border-border overflow-hidden">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
            <View className="h-8 w-8 rounded-full bg-gray-100 items-center justify-center mr-3">
              <User size={16} color="#374151" />
            </View>
            <Text className="flex-1 text-base text-foreground font-medium">Thông tin cá nhân</Text>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center p-4" onPress={handleLogout}>
            <View className="h-8 w-8 rounded-full bg-red-100 items-center justify-center mr-3">
              <LogOut size={16} color="#ef4444" />
            </View>
            <Text className="flex-1 text-base text-red-600 font-medium">Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
