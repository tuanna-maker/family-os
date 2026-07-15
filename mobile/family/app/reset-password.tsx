import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { getSupabase } from "@shared/supabase/get-client";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useI18n } from "@mobile/i18n/useI18n";
import { colors } from "@mobile/theme/colors";

function parseTokensFromUrl(url: string) {
  const hash = url.includes("#") ? url.split("#")[1] : "";
  const query = url.includes("?") ? url.split("?")[1].split("#")[0] : hash;
  const params = new URLSearchParams(query || hash);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { s } = useI18n();
  const a = s.auth;
  const c = s.common;
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

    const applyUrl = async (url: string | null) => {
      if (!url) return;
      const { access_token, refresh_token } = parseTokensFromUrl(url);
      if (access_token && refresh_token) {
        const { error: err } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (!err) setSessionOk(true);
      }
    };

    Linking.getInitialURL().then(applyUrl);
    const sub = Linking.addEventListener("url", (e) => applyUrl(e.url));

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setSessionOk(true);
      setReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionOk(true);
      setReady(true);
    });

    return () => {
      sub.remove();
      authSub.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    setError("");
    if (password.length < 6) {
      setError(a.passwordMinLength);
      return;
    }
    if (password !== confirm) {
      setError(a.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.replace("/login"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : a.passwordChangeFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.root}>
        <Text style={styles.sub}>{a.verifyingLink}</Text>
      </View>
    );
  }

  if (!sessionOk) {
    return (
      <View style={styles.root}>
        <PageHeader title={a.resetTitle} back="/login" />
        <Text style={styles.sub}>{a.resetNoSession}</Text>
        <Pressable onPress={() => router.replace("/forgot-password")}>
          <Text style={styles.link}>{a.resendEmail}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHeader title={a.newPasswordTitle} back="/login" />
      {done ? (
        <Text style={styles.ok}>{a.passwordChanged}</Text>
      ) : (
        <>
          <TextField label={a.newPassword} value={password} onChangeText={setPassword} secureTextEntry />
          <TextField label={a.confirmPassword} value={confirm} onChangeText={setConfirm} secureTextEntry />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <PrimaryButton label={c.savePassword} onPress={submit} loading={busy} />
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 16 },
  sub: { color: colors.muted, lineHeight: 20, marginBottom: 12 },
  err: { color: colors.emergency, marginBottom: 8 },
  ok: { color: colors.success, marginTop: 12 },
  link: { color: colors.brand, fontWeight: "700" },
});
