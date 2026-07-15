import { useState } from "react";
import { Switch, Text, View, Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Shield, KeyRound, Eye, Smartphone, BarChart3 } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { useAuth } from "@mobile/hooks/useAuth";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";
import { radius } from "@mobile/theme/colors";
import { getSupabase } from "@shared/supabase/get-client";
import { toast } from "@mobile/utils/toast";

export default function BaoMatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { hideProfileEmail, setHideProfileEmail, shareAnalytics, setShareAnalytics } = useAppPrefs();
  const { colors } = useTheme();
  const { s } = useI18n();
  const sec = s.settings.security;
  const styles = useSecurityStyles();
  const [email, setEmail] = useState(user?.email ?? "");

  const resetMut = useMutation({
    mutationFn: async () => {
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new Error(s.auth.invalidEmail);
      }
      const redirectTo = Linking.createURL("reset-password");
      const { error } = await getSupabase().auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
    },
    onSuccess: () => toast.success(sec.passwordSection.resetSentShort),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={sec.title} eyebrow={sec.eyebrow} back="/(tabs)/tai-khoan" />

      <SectionHeader title={sec.privacySection} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Eye color={colors.brand} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{sec.hideEmail}</Text>
            <Text style={styles.desc}>{sec.hideEmailDescLong}</Text>
          </View>
          <Switch value={hideProfileEmail} onValueChange={setHideProfileEmail} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <BarChart3 color={colors.brand} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{sec.analyticsTitle}</Text>
            <Text style={styles.desc}>{sec.analyticsDescLong}</Text>
          </View>
          <Switch value={shareAnalytics} onValueChange={setShareAnalytics} />
        </View>
      </Card>

      <SectionHeader title={sec.passwordSection.title} />
      <Card style={styles.cardPad}>
        <TextField
          label={sec.passwordSection.registeredEmail}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="email@domain.com"
        />
        <PrimaryButton
          label={sec.passwordSection.sendResetLink}
          onPress={() => resetMut.mutate()}
          loading={resetMut.isPending}
        />
        <Pressable onPress={() => router.push("/forgot-password" as Href)} style={{ marginTop: 10 }}>
          <Text style={styles.link}>{sec.passwordSection.openResetScreen}</Text>
        </Pressable>
      </Card>

      <SectionHeader title={sec.accountData.title} />
      <Card style={styles.card}>
        <Pressable
          style={styles.linkRow}
          onPress={() =>
            router.push({
              pathname: "/lien-he",
              params: { subject: sec.accountData.deleteDataSubject },
            } as Href)
          }
        >
          <View style={styles.iconWrap}>
            <Shield color={colors.brand} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{sec.accountData.deleteData}</Text>
            <Text style={styles.desc}>{sec.accountData.deleteDataDesc}</Text>
          </View>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.linkRow} onPress={() => router.push("/cai-dat/ngon-ngu" as Href)}>
          <View style={styles.iconWrap}>
            <KeyRound color={colors.brand} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{sec.accountData.languageDisplay}</Text>
            <Text style={styles.desc}>{sec.accountData.languageDisplayDesc}</Text>
          </View>
        </Pressable>
      </Card>

      <SectionHeader title={sec.device.title} />
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Smartphone color={colors.brand} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{sec.device.session}</Text>
            <Text style={styles.desc}>{sec.device.sessionDesc}</Text>
          </View>
        </View>
      </Card>

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useSecurityStyles() {
  return useThemedStyles((c, fontScale) => ({
    card: { padding: 0, marginBottom: 12, overflow: "hidden" as const },
    cardPad: { padding: 16, marginBottom: 12, gap: 8 },
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 16 },
    linkRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 16 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    title: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    desc: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4, lineHeight: 17 },
    divider: { height: 1, backgroundColor: c.cardBorder, marginHorizontal: 16 },
    link: { fontSize: 12 * fontScale, color: c.brand, fontWeight: "600" as const, textAlign: "center" as const },
  }));
}
