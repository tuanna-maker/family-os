import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Pencil, UserPlus, X } from "lucide-react-native";
import { listFamilyMembers } from "@mobile/api/family-members";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import { memberDisplayName } from "./FamilyMemberSelect";

function initials(name: string | null, email: string | null) {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function FamilyMembersSheet({
  visible,
  onClose,
  back = "/(tabs)/gia-dinh",
}: {
  visible: boolean;
  onClose: () => void;
  back?: string;
}) {
  const { familyId, family, profile } = useFamilyContext();
  const { locale, s } = useI18n();
  const { colors } = useTheme();
  const styles = useSheetStyles();
  const router = useRouter();

  const q = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => listFamilyMembers({ family_id: familyId! }),
    enabled: !!familyId && visible,
    staleTime: 30_000,
  });

  const members = q.data?.members ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{s.members.sheetTitle}</Text>
              <Text style={styles.sub}>
                {family?.name ?? s.common.familyLabel} · {s.members.count(members.length)}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X color={colors.muted} size={20} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {members.map((m) => {
              const name = memberDisplayName(m, locale);
              const isSelf = profile?.id === m.user_id;
              return (
                <Pressable
                  key={m.id}
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    if (isSelf) router.push("/(tabs)/tai-khoan");
                    else router.push("/gia-dinh/thanh-vien" as Href);
                  }}
                >
                  {m.avatar_url ? (
                    <Image source={{ uri: m.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{initials(m.full_name, m.email)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {name}
                      </Text>
                      {isSelf ? <Text style={styles.selfBadge}>{s.members.you}</Text> : null}
                      {m.is_owner ? (
                        <View style={styles.ownerBadge}>
                          <Crown color={colors.warning} size={10} />
                          <Text style={styles.ownerText}>{s.members.head}</Text>
                        </View>
                      ) : null}
                      {!m.is_owner && m.role === "family_owner" ? (
                        <Text style={styles.coOwnerBadge}>{s.roles.coOwner}</Text>
                      ) : null}
                    </View>
                    {m.email ? (
                      <Text style={styles.email} numberOfLines={1}>
                        {m.email}
                      </Text>
                    ) : null}
                  </View>
                  {isSelf ? <Pencil color={colors.brand} size={16} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              onClose();
              router.push("/gia-dinh/moi-thanh-vien" as Href);
            }}
          >
            <UserPlus color={colors.brand} size={18} />
            <Text style={styles.actionText}>{s.members.invite}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnMuted]}
            onPress={() => {
              onClose();
              router.push("/gia-dinh/thanh-vien" as Href);
            }}
          >
            <Text style={styles.actionText}>{s.members.viewManage}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function useSheetStyles() {
  return useThemedStyles((c, fontScale) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end" as const,
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      borderWidth: 1,
      borderColor: c.cardBorder,
      maxHeight: "82%" as const,
    },
    header: { flexDirection: "row" as const, alignItems: "flex-start" as const, marginBottom: 12 },
    title: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground },
    sub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    list: { maxHeight: 360, marginBottom: 8 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: { fontSize: 13 * fontScale, fontWeight: "800" as const, color: c.brand },
    name: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    email: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    selfBadge: {
      fontSize: 10 * fontScale,
      fontWeight: "700" as const,
      color: c.brand,
      backgroundColor: c.tintBlue,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    ownerBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 3,
      backgroundColor: c.tintOrange,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    ownerText: { fontSize: 10 * fontScale, fontWeight: "700" as const, color: c.warning },
    coOwnerBadge: {
      fontSize: 10 * fontScale,
      fontWeight: "600" as const,
      color: c.muted,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    actionBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      marginTop: 8,
      paddingVertical: 13,
      borderRadius: radius.lg,
      backgroundColor: c.tintBlue,
    },
    actionBtnMuted: { backgroundColor: c.mutedBg },
    actionText: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.brand },
  }));
}
