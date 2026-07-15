import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, HardDrive, Trash2, Users } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  createHouseholdInvite,
  getFamilyQuota,
  inviteWebUrl,
  listHouseholdInvites,
  revokeHouseholdInvite,
} from "@mobile/api/household-invite";
import { inviteIsActive, inviteStatusChip } from "@mobile/utils/inviteStatus";
import { toast } from "@mobile/utils/toast";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function MoiThanhVienScreen() {
  const { familyId, family } = useFamilyContext();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const inv = s.screens.invite;
  const styles = useInviteStyles();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function copyLink(link: string) {
    try {
      await Share.share({ message: link, title: inv.shareLinkTitle });
    } catch {
      toast.error(inv.shareLinkFailed);
    }
  }

  const quotaQ = useQuery({
    queryKey: ["family-quota", familyId],
    queryFn: () => getFamilyQuota({ household_id: familyId! }),
    enabled: !!familyId,
  });

  const invitesQ = useQuery({
    queryKey: ["household-invites", familyId],
    queryFn: () => listHouseholdInvites({ household_id: familyId! }),
    enabled: !!familyId,
  });

  const createM = useMutation({
    mutationFn: () =>
      createHouseholdInvite({
        household_id: familyId!,
        invited_email: email.trim() || undefined,
        invited_phone: phone.trim() || undefined,
        expires_in_days: 7,
      }),
    onSuccess: async (res) => {
      toast.success(inv.inviteCreated);
      await copyLink(res.web_url);
      setEmail("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["household-invites", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeM = useMutation({
    mutationFn: (inviteId: string) => revokeHouseholdInvite({ invite_id: inviteId }),
    onSuccess: () => {
      toast.success(inv.inviteRevoked);
      qc.invalidateQueries({ queryKey: ["household-invites", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!familyId) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title={inv.title} eyebrow={s.common.familyCore} back="/(tabs)/gia-dinh" />
        <Card style={{ padding: 16 }}>
          <Text style={styles.emptyText}>{inv.noFamily}</Text>
        </Card>
      </Screen>
    );
  }

  const quota = quotaQ.data;
  const storagePct = quota
    ? Math.round((quota.storage_used_bytes / Math.max(1, quota.storage_limit_bytes)) * 100)
    : 0;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={inv.title}
        subtitle={family?.name ?? undefined}
        eyebrow={s.common.familyCore}
        back="/gia-dinh/thanh-vien"
      />

      <Card style={styles.quotaCard}>
        <SectionHeader title={inv.quotaTitle} />
        {quotaQ.isLoading ? (
          <LoadingState />
        ) : quota ? (
          <View style={styles.quotaGrid}>
            <View style={styles.quotaBox}>
              <View style={styles.quotaLabelRow}>
                <Users color={colors.muted} size={14} />
                <Text style={styles.quotaLabel}>{inv.membersQuota}</Text>
              </View>
              <Text style={styles.quotaValue}>
                {quota.members_count}/{quota.members_limit}
              </Text>
            </View>
            <View style={styles.quotaBox}>
              <View style={styles.quotaLabelRow}>
                <HardDrive color={colors.muted} size={14} />
                <Text style={styles.quotaLabel}>{inv.storageQuota}</Text>
              </View>
              <Text style={styles.quotaValue}>{storagePct}%</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>{inv.noQuotaData}</Text>
        )}
      </Card>

      <Card style={styles.formCard}>
        <SectionHeader title={inv.createInviteTitle} subtitle={inv.expiresInDays} />
        <TextField
          label={inv.emailOptional}
          value={email}
          onChangeText={setEmail}
          placeholder="nguoi-than@email.com"
          keyboardType="email-address"
        />
        <TextField
          label={inv.phoneOptional}
          value={phone}
          onChangeText={setPhone}
          placeholder="0912 345 678"
          keyboardType="numeric"
        />
        <PrimaryButton
          label={inv.createAndCopy}
          onPress={() => createM.mutate()}
          loading={createM.isPending}
          disabled={createM.isPending}
        />
      </Card>

      <SectionHeader title={inv.createdInvites} />
      {invitesQ.isLoading ? (
        <LoadingState />
      ) : invitesQ.isError ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {(invitesQ.error as Error).message.includes("schema") ||
            (invitesQ.error as Error).message.includes("household")
              ? "Hệ thống mời thành viên chưa được cấu hình trên máy chủ. Vui lòng chạy migration household hoặc liên hệ quản trị."
              : (invitesQ.error as Error).message}
          </Text>
        </Card>
      ) : (invitesQ.data?.length ?? 0) === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>{inv.noInvites}</Text>
        </Card>
      ) : (
        (invitesQ.data ?? []).map((item) => {
          const chip = inviteStatusChip(item, colors, locale);
          const link = inviteWebUrl(item.token);
          const active = inviteIsActive(item);
          return (
            <Card key={item.id} style={styles.inviteCard}>
              <View style={styles.inviteRow}>
                <View style={styles.inviteBody}>
                  <View style={styles.inviteTop}>
                    <Text style={[styles.statusBadge, { color: chip.color, backgroundColor: chip.bg }]}>
                      {chip.label}
                    </Text>
                    <Text style={styles.expires}>
                      {inv.expiresAt(formatDate(item.expires_at, locale))}
                    </Text>
                  </View>
                  <Text style={styles.inviteTarget} numberOfLines={1}>
                    {item.invited_email ?? item.invited_phone ?? inv.unknownTarget}
                  </Text>
                  <Text style={styles.tokenPreview} numberOfLines={1}>
                    {item.token.slice(0, 16)}…
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => {
                      copyLink(link);
                      toast.success(inv.shareInviteLink);
                    }}
                  >
                    <Copy color={colors.foreground} size={18} />
                  </Pressable>
                  {active ? (
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => revokeM.mutate(item.id)}
                      disabled={revokeM.isPending}
                    >
                      <Trash2 color={colors.emergency} size={18} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Card>
          );
        })
      )}

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useInviteStyles() {
  return useThemedStyles((c, fontScale) => ({
    quotaCard: { padding: 16, marginBottom: 12 },
    quotaGrid: { flexDirection: "row" as const, gap: 10 },
    quotaBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: radius.lg,
      padding: 12,
    },
    quotaLabelRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    quotaLabel: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: c.muted,
      letterSpacing: 0.6,
    },
    quotaValue: { fontSize: 20 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 6 },
    formCard: { padding: 16, marginBottom: 16, gap: 4 },
    emptyCard: { padding: 20, alignItems: "center" as const },
    emptyText: { fontSize: 13 * fontScale, color: c.muted, textAlign: "center" as const },
    inviteCard: { padding: 14, marginBottom: 8 },
    inviteRow: { flexDirection: "row" as const, gap: 10 },
    inviteBody: { flex: 1, minWidth: 0 },
    inviteTop: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flexWrap: "wrap" as const },
    statusBadge: {
      fontSize: 10,
      fontWeight: "700" as const,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    expires: { fontSize: 11 * fontScale, color: c.muted },
    inviteTarget: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, marginTop: 8 },
    tokenPreview: { fontSize: 11 * fontScale, color: c.muted, marginTop: 4, fontFamily: "monospace" },
    inviteActions: { gap: 8 },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.mutedBg,
    },
  }));
}
