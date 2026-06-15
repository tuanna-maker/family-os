import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff } from "lucide-react-native";
import { getSupabase } from "@shared/supabase/get-client";
import { resolveLoginEmail } from "@guard/api/username";
import { getMyContext } from "@guard/api/auth";
import { ensureSupabase, getPilotLoginDefaults } from "@mobile/lib/supabase";
import { GuardHeaderActions } from "@mobile/components/GuardHeaderActions";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useTheme } from "@mobile/theme/themeStore";
import { radius } from "@mobile/theme/colors";

const APP_ICON = require("../../assets/images/icon.png");
const GENERIC_AUTH_ERROR = "Tên đăng nhập/email hoặc mật khẩu không đúng.";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const pilot = getPilotLoginDefaults();
  const [identifier, setIdentifier] = useState(pilot.identifier);
  const [password, setPassword] = useState(pilot.password);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const canSubmit = !!identifier.trim() && !!password && !loading;

  async function signIn() {
    if (!identifier.trim() || !password) {
      showAppAlert({ title: "Lỗi", message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
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
      showAppAlert({
        title: "Đăng nhập thất bại",
        message: (e as Error).message || GENERIC_AUTH_ERROR,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.themeToggle, { top: Math.max(insets.top + 8, 16) }]}>
        <GuardHeaderActions showBell={false} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: Math.max(insets.top + 48, 72), paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image source={APP_ICON} style={styles.logo} resizeMode="cover" accessibilityLabel="STOS Guard" />
          <Text style={[styles.brand, { color: colors.foreground }]}>
            STOS <Text style={{ color: colors.brand }}>Guard</Text>
          </Text>
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.navy,
            },
          ]}
        >
          <Text style={[styles.welcome, { color: colors.foreground }]}>Chào mừng trở lại</Text>
          <Text style={[styles.welcomeSub, { color: colors.muted }]}>
            Đăng nhập để bắt đầu ca trực và tuần tra.
          </Text>

          <Text style={[styles.label, { color: colors.foreground }]}>Tên đăng nhập hoặc email</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder }]}>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              placeholder="nguyenvana hoặc ban@vidu.vn"
              placeholderTextColor={colors.muted}
              editable={!loading}
              style={[styles.input, { color: colors.foreground }]}
            />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Mật khẩu</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder }]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              editable={!loading}
              style={[styles.input, { color: colors.foreground, flex: 1 }]}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
              {showPassword ? <EyeOff color={colors.muted} size={20} /> : <Eye color={colors.muted} size={20} />}
            </Pressable>
          </View>

          <TouchableOpacity
            onPress={signIn}
            disabled={!canSubmit}
            activeOpacity={0.88}
            style={[styles.signInBtn, { backgroundColor: colors.brand }, !canSubmit && styles.signInBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signInBtnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.terms, { color: colors.muted }]}>
            Bằng việc tiếp tục, bạn đồng ý với điều khoản dịch vụ.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  themeToggle: { position: "absolute", right: 16, zIndex: 10 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: 28 },
  logo: { width: 96, height: 96, borderRadius: radius.xl, marginBottom: 18 },
  brand: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  signInBtn: {
    marginTop: 20,
    alignSelf: "stretch" as const,
    minHeight: 52,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  signInBtnDisabled: { opacity: 0.5 },
  signInBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" as const },
  formCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  welcome: { fontSize: 20, fontWeight: "700" },
  welcomeSub: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  input: { fontSize: 16, paddingVertical: 14, flex: 1 },
  eyeBtn: { padding: 4 },
  terms: { fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
