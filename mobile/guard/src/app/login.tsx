import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSupabase } from "@shared/supabase/get-client";
import { resolveLoginEmail } from "@guard/api/username";
import { getMyContext } from "@guard/api/auth";
import { ensureSupabase, getPilotLoginDefaults } from "@mobile/lib/supabase";
import { Eye, EyeOff } from "lucide-react-native";
import { Input } from "@mobile/components/ui/Input";
import { GuardHeaderActions } from "@mobile/components/GuardHeaderActions";
import { useTheme } from "@mobile/theme/themeStore";

const GENERIC_AUTH_ERROR = "Tên đăng nhập/email hoặc mật khẩu không đúng.";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pilot = getPilotLoginDefaults();
  const [identifier, setIdentifier] = useState(pilot.identifier);
  const [password, setPassword] = useState(pilot.password);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  async function signIn() {
    if (!identifier.trim() || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      ensureSupabase();
      const supabase = getSupabase();
      let loginEmail = identifier.trim();
      if (!loginEmail.includes("@")) {
        const res = await resolveLoginEmail(loginEmail);
        if (!res.email) throw new Error(GENERIC_AUTH_ERROR);
        loginEmail = res.email;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (error) throw new Error(GENERIC_AUTH_ERROR);

      const ctx = await getMyContext();
      if (!ctx.isSecurity) {
        await supabase.auth.signOut();
        throw new Error("Tài khoản không thuộc đội an ninh STOS Guard.");
      }
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Đăng nhập thất bại", (e as Error).message || GENERIC_AUTH_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View
        className="absolute right-0 z-10 px-6"
        style={{ top: Math.max(insets.top + 8, 16) }}
      >
        <GuardHeaderActions showBell={false} />
      </View>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top + 8, 24) }}
        className="flex-1 px-6 py-12"
      >
        <View className="flex-1 justify-center max-w-md w-full self-center">
          <View className="flex-row items-center gap-3 mb-8">
            <LinearGradient
              colors={["#2563EB", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text className="text-2xl">🛡️</Text>
            </LinearGradient>
            <View>
              <Text className="text-base font-bold text-foreground">STOS Guard</Text>
              <Text className="text-[11px] text-muted-foreground">
                Security Core · Ca trực & tuần tra
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              Chào mừng trở lại
            </Text>
            <Text className="text-sm text-muted-foreground mt-1.5">
              Đăng nhập để bắt đầu ca trực và tuần tra.
            </Text>
            {pilot.label ? (
              <View className="mt-3 bg-card border border-border rounded-xl px-3 py-2">
                <Text className="text-xs text-brand">
                  Pilot: {pilot.label} · {pilot.identifier}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="space-y-4 mt-2">
            <Input
              label="TÊN ĐĂNG NHẬP HOẶC EMAIL"
              placeholder="nguyenvana hoặc ban@vidu.vn"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              editable={!loading}
            />
            <View className="h-2" />
            <Input
              label="MẬT KHẨU MỚI"
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
              rightAccessory={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOff color={colors.muted} size={20} />
                  ) : (
                    <Eye color={colors.muted} size={20} />
                  )}
                </TouchableOpacity>
              }
            />
            <View className="h-6" />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={signIn}
              disabled={loading}
              className="w-full shadow-md"
            >
              <LinearGradient
                colors={["#2563EB", "#EC4899"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-semibold text-base">Đăng nhập</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text className="text-center text-[11px] text-muted-foreground mt-6">
              Bằng việc tiếp tục, bạn đồng ý với điều khoản dịch vụ.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
