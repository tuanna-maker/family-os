import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { useI18n } from "@mobile/i18n/useI18n";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { getUserProfileDetails, updateUserProfile } from "@mobile/api/profile";
import { toast } from "@mobile/utils/toast";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const styles = useInfoStyles();
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

export default function ThongTinTaiKhoanScreen() {
  const { s } = useI18n();
  const p = s.account.profile;
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const profileQ = useQuery({ queryKey: ["user-profile-details"], queryFn: () => getUserProfileDetails() });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!profileQ.data) return;
    setFullName(profileQ.data.full_name ?? "");
    setPhone(profileQ.data.phone ?? "");
    setUsername(profileQ.data.username ?? "");
  }, [profileQ.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateUserProfile({
        full_name: fullName,
        phone,
        username: username || undefined,
      }),
    onSuccess: async () => {
      toast.success(p.saved);
      await qc.invalidateQueries({ queryKey: ["user-profile-details"] });
      await qc.invalidateQueries({ queryKey: ["my-context"] });
      await qc.invalidateQueries({ queryKey: ["family-members"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : s.common.tryAgain),
  });

  const apartment =
    family?.apartment?.trim() ||
    [profileQ.data?.apartment_no, profileQ.data?.building_name].filter(Boolean).join(", ") ||
    "—";

  const isOwner = !!family?.owner_id && family.owner_id === profileQ.data?.id;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={p.title} eyebrow={p.eyebrow} back="/(tabs)/tai-khoan" />

      <SectionHeader title={p.sectionEdit} subtitle={p.sectionEditSub} />

      <Card>
        <TextField label={p.fullName} value={fullName} onChangeText={setFullName} placeholder={p.fullNamePh} />
        <View style={{ height: 12 }} />
        <TextField
          label={p.phone}
          value={phone}
          onChangeText={setPhone}
          placeholder={p.phonePh}
          keyboardType="phone-pad"
        />
        <View style={{ height: 12 }} />
        <TextField
          label={p.username}
          value={username}
          onChangeText={setUsername}
          placeholder={p.usernamePh}
          autoCapitalize="none"
        />
        <View style={{ height: 16 }} />
        <PrimaryButton
          label={s.common.save}
          onPress={() => saveMut.mutate()}
          loading={saveMut.isPending}
          disabled={!fullName.trim() || saveMut.isPending}
        />
      </Card>

      <SectionHeader title={p.sectionReadonly} subtitle={p.sectionReadonlySub} />

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <InfoRow label={p.email} value={profileQ.data?.email ?? ""} />
        <InfoRow label={p.apartment} value={apartment} />
        <InfoRow label={p.role} value={isOwner ? p.roleOwner : p.roleMember} last />
      </Card>

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useInfoStyles() {
  return useThemedStyles((c, fontScale) => ({
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    label: { flex: 1, fontSize: 13 * fontScale, color: c.muted },
    value: {
      flex: 1,
      fontSize: 14 * fontScale,
      fontWeight: "600" as const,
      color: c.foreground,
      textAlign: "right" as const,
    },
    rowLast: { borderBottomWidth: 0 },
  }));
}
