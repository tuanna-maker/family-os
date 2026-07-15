import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getSupabase } from "@shared/supabase/get-client";
import * as Linking from "expo-linking";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useI18n } from "@mobile/i18n/useI18n";
import { colors, radius } from "@mobile/theme/colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { s } = useI18n();
  const a = s.auth;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setError("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(a.invalidEmail);
      return;
    }
    setBusy(true);
    try {
      const redirectTo = Linking.createURL("reset-password");
      const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) throw err;
      setInfo(a.resetSent);
    } catch (e) {
      setError(e instanceof Error ? e.message : a.emailSendFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHeader title={a.forgotTitle} back="/login" />
      <Text style={styles.sub}>{a.forgotSub}</Text>
      <TextField label={a.email} value={email} onChangeText={setEmail} keyboardType="email-address" />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {info ? <Text style={styles.ok}>{info}</Text> : null}
      <PrimaryButton label={a.sendLink} onPress={submit} loading={busy} disabled={!email.trim()} />
      <Pressable onPress={() => router.replace("/login")} style={{ marginTop: 16 }}>
        <Text style={styles.link}>{a.backToLogin}</Text>
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
