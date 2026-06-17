import { useMemo, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import {
  ChevronRight,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  Settings,
  User,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { AvatarUploadButton } from "@mobile/components/AvatarUploadButton";
import { useAuth } from "@mobile/hooks/useAuth";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { useI18n } from "@mobile/i18n/useI18n";
import { getMyContext } from "@shared/supabase/auth";
import { uploadAvatarFromUri, updateProfileAvatar } from "@mobile/api/avatars";
import { getUserProfileDetails } from "@mobile/api/profile";
import { resolveHouseholdAvatarUrl } from "@mobile/lib/household-avatar";
import { formatMemberName } from "@mobile/utils/displayName";
import { toast } from "@mobile/utils/toast";
import { showAppConfirm } from "@mobile/components/AppAlert";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

type LinkItem = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  value?: string;
};

export default function TaiKhoanScreen() {
  const { signOut, user } = useAuth();
  const { profile, family } = useFamilyContext();
  const router = useRouter();
  const { theme, locale, setTheme } = useAppPrefs();
  const { s } = useI18n();
  const c = s.common;
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useAccountStyles();
  const [signingOut, setSigningOut] = useState(false);

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getMyContext() });
  const profileQ = useQuery({ queryKey: ["user-profile-details"], queryFn: () => getUserProfileDetails() });
  const isOwner = !!ctxQ.data?.userId && family?.owner_id === ctxQ.data.userId;

  const displayName = useMemo(() => {
    const raw = profile?.full_name?.trim() || user?.email?.split("@")[0] || c.memberDefault;
    return formatMemberName(raw, { isOwner, appendOwner: isOwner });
  }, [profile?.full_name, user?.email, isOwner]);

  const avatarInitial = formatMemberName(profile?.full_name ?? user?.email ?? "T", { appendOwner: false });
  const displayAvatarUrl = resolveHouseholdAvatarUrl({ profile, family, isOwner });

  const onUploadAvatar = async (uri: string) => {
    const url = await uploadAvatarFromUri(uri, "avatar");
    await updateProfileAvatar({ avatar_url: url });
    toast.success(c.avatarUpdated);
    qc.invalidateQueries({ queryKey: ["my-context"] });
    qc.invalidateQueries({ queryKey: ["family-members"] });
  };

  const links: LinkItem[] = [
    {
      icon: User,
      label: s.account.profile.menuLabel,
      onPress: () => router.push("/cai-dat/thong-tin" as Href),
    },
    {
      icon: Settings,
      label: `${s.settings.notifications.eyebrow} · ${s.settings.notifications.title}`,
      onPress: () => router.push("/cai-dat/thong-bao"),
    },
    {
      icon: Lock,
      label: s.account.security,
      onPress: () => router.push("/cai-dat/bao-mat" as Href),
    },
    {
      icon: Globe,
      label: s.account.language,
      onPress: () => router.push("/cai-dat/ngon-ngu" as Href),
      value: locale === "vi" ? s.account.languageVi : s.account.languageEn,
    },
    { icon: HelpCircle, label: s.account.support, onPress: () => router.push("/lien-he") },
  ];

  const confirmSignOut = () => {
    showAppConfirm({
      title: c.signOutTitle,
      message: c.signOutMessage,
      confirmText: s.account.signOut,
      cancelText: c.cancel,
      destructive: true,
      onConfirm: async () => {
        setSigningOut(true);
        try {
          await signOut();
        } finally {
          setSigningOut(false);
        }
      },
    });
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={s.account.title} showBack={false} />

      <Card style={styles.profileCard}>
        <AvatarUploadButton
          uri={displayAvatarUrl}
          fallbackInitial={avatarInitial}
          size={64}
          onPick={onUploadAvatar}
        />
        <View style={styles.profileText}>
          <Text style={styles.name} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user?.email ?? ctxQ.data?.email ?? ""}
          </Text>
          {profileQ.data?.phone ? (
            <Text style={styles.meta} numberOfLines={1}>
              {profileQ.data.phone}
            </Text>
          ) : null}
          {family?.apartment ? (
            <Text style={styles.meta} numberOfLines={1}>
              {family.apartment}
            </Text>
          ) : null}
        </View>
      </Card>

      <Card style={styles.menuCard}>
        {links.map((item, i) => (
          <Pressable
            key={item.label}
            style={[styles.menuRow, i < links.length - 1 && styles.menuRowBorder]}
            onPress={item.onPress}
          >
            <View style={styles.menuIcon}>
              <item.icon color={colors.foreground} size={18} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
            <ChevronRight color={colors.muted} size={18} />
          </Pressable>
        ))}

        <View style={[styles.menuRow, styles.themeRow]}>
          <View style={styles.menuIcon}>
            <Moon color={colors.foreground} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>{s.account.darkMode}</Text>
            <Text style={styles.themeHint}>{theme === "dark" ? s.account.darkOn : s.account.darkOff}</Text>
          </View>
          <Switch
            value={theme === "dark"}
            onValueChange={(v) => setTheme(v ? "dark" : "light")}
          />
        </View>
      </Card>

      <Pressable style={styles.logoutBtn} onPress={confirmSignOut} disabled={signingOut}>
        <LogOut color={colors.emergency} size={18} />
        <Text style={styles.logoutText}>{signingOut ? s.account.signingOut : s.account.signOut}</Text>
      </Pressable>

      <Text style={styles.version}>STOS Life v1.0</Text>
      <View style={{ height: 24 }} />
    </Screen>
  );
}

function useAccountStyles() {
  return useThemedStyles((c, fontScale) => ({
    profileCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      marginBottom: 16,
      padding: 16,
    },
    profileText: { flex: 1, minWidth: 0 },
    name: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground },
    email: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },
    meta: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    menuCard: { padding: 0, overflow: "hidden" as const, marginBottom: 12 },
    menuRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    menuRowBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    themeRow: { borderTopWidth: 1, borderTopColor: c.cardBorder },
    themeHint: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.lg,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    menuLabel: { flex: 1, fontWeight: "600" as const, color: c.foreground, fontSize: 14 * fontScale },
    menuValue: { fontSize: 12 * fontScale, color: c.muted, marginRight: 4 },
    logoutBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      padding: 16,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    logoutText: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.emergency },
    version: { textAlign: "center" as const, fontSize: 10 * fontScale, color: c.muted, marginTop: 12 },
  }));
}
