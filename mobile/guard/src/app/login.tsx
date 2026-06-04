import React, { useState } from 'react';
import { View, Text, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'react-router-native'; // Wait, expo-router uses from 'expo-router'
import { useRouter as useExpoRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const router = useExpoRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Đăng nhập thất bại', error.message);
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1 p-6">
        <View className="flex-1 items-center justify-center min-h-[400px]">
          <View className="items-center mb-10">
            <Text className="text-3xl font-bold tracking-tight text-white mt-4">STOS Guard</Text>
            <Text className="text-gray-400 mt-2 text-center">
              Hệ thống quản lý an ninh nội khu STOS Family
            </Text>
          </View>

          <View className="w-full max-w-sm space-y-4 bg-white/10 p-6 rounded-2xl border border-white/20">
            <Input
              label="Email hoặc Mã nhân viên"
              placeholder="nv.aninh@stos.vn"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              className="bg-white/90 border-0"
            />
            <View className="h-4" />
            <Input
              label="Mật khẩu"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              className="bg-white/90 border-0"
            />

            <View className="h-6" />
            <Button
              className="w-full bg-blue-600"
              onPress={signInWithEmail}
              isLoading={loading}
            >
              Đăng nhập
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
