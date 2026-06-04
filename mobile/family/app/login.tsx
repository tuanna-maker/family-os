import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { getSupabase } from "@shared/supabase/get-client";
import { getPilotLoginDefaults } from "@mobile/lib/supabase";
import { resolveLoginEmail } from "@mobile/api/username";
import { PrimaryButton } from "@mobile/components/ui";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

const APP_ICON = require("../assets/icon.webp");

function useLoginStyles() {
  return useThemedStyles((colors, fontScale) => ({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 24,
      justifyContent: "center",
    },
    hero: { alignItems: "center" as const, marginBottom: 36 },
    logo: {
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      marginBottom: 16,
    },
    brand: { fontSize: 28 * fontScale, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.5 },
    sub: { fontSize: 13 * fontScale, color: colors.muted, marginTop: 6, textAlign: "center" as const },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 20,
      gap: 4,
      ...cardShadow(colors),
    },
    label: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: colors.foreground, marginTop: 8 },
    inputWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      minHeight: 52,
      gap: 8,
    },
    input: { flex: 1, fontSize: 16 * fontScale, color: colors.foreground, paddingVertical: 14 },
    forgot: { textAlign: "center" as const, color: colors.brand, fontWeight: "600" as const, fontSize: 14 * fontScale },
  }));
}

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useLoginStyles();
  const defaults = getPilotLoginDefaults();
  const [identifier, setIdentifier] = useState(defaults.identifier);
  const [password, setPassword] = useState(defaults.password);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    try {
      const supabase = getSupabase();
      let email = identifier.trim();
      if (!email.includes("@")) {
        const res = await resolveLoginEmail(email);
        if (!res.email) {
          Alert.alert("Lỗi", "Email hoặc tên đăng nhập không đúng.");
          return;
        }
        email = res.email;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert("Lỗi đăng nhập", error.message);
        return;
      }
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không thể đăng nhập");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.hero}>
        <Image source={APP_ICON} style={styles.logo} resizeMode="cover" accessibilityLabel="STOS Family" />
        <Text style={styles.brand}>
          STOS <Text style={{ color: colors.brand }}>Life</Text>
        </Text>
        <Text style={styles.sub}>Hệ điều hành cho gia đình đô thị</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Email hoặc tên đăng nhập</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>

        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            {showPassword ? <EyeOff color={colors.muted} size={20} /> : <Eye color={colors.muted} size={20} />}
          </Pressable>
        </View>

        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Đăng nhập" onPress={signIn} loading={busy} disabled={!identifier || !password} />
        </View>
        <Pressable onPress={() => router.push("/forgot-password")} style={{ marginTop: 14 }}>
          <Text style={styles.forgot}>Quên mật khẩu?</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
