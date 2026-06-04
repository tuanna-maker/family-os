import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getSupabase } from "@shared/supabase/get-client";
import * as Linking from "expo-linking";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { colors, radius } from "@mobile/theme/colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setError("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Email không hợp lệ.");
      return;
    }
    setBusy(true);
    try {
      const redirectTo = Linking.createURL("reset-password");
      const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) throw err;
      setInfo("Đã gửi liên kết đặt lại mật khẩu. Kiểm tra email (và mục Spam).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHeader title="Quên mật khẩu" back="/login" />
      <Text style={styles.sub}>Nhập email để nhận liên kết đặt lại mật khẩu.</Text>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {info ? <Text style={styles.ok}>{info}</Text> : null}
      <PrimaryButton label="Gửi liên kết" onPress={submit} loading={busy} disabled={!email.trim()} />
      <Pressable onPress={() => router.replace("/login")} style={{ marginTop: 16 }}>
        <Text style={styles.link}>Quay lại đăng nhập</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16 },
  sub: { color: colors.muted, marginBottom: 16, lineHeight: 20 },
  err: { color: colors.emergency, marginBottom: 8 },
  ok: { color: colors.success, marginBottom: 8, lineHeight: 20 },
  link: { color: colors.brand, fontWeight: "700", textAlign: "center" },
});
