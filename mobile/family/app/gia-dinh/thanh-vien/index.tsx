import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Pencil, UserPlus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { listFamilyMembers } from "@mobile/api/family-members";
import { memberDisplayName } from "@mobile/components/family/FamilyMemberSelect";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

function initials(name: string | null, email: string | null) {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function FamilyMembersScreen() {
  const router = useRouter();
  const { familyId, family, profile } = useFamilyContext();
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    topRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 12,
    },
    count: { fontSize: 12 * fontScale, color: c.muted },
    inviteBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
    inviteText: { fontSize: 13 * fontScale, fontWeight: "700" as const, color: c.brand },
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 14 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: { color: c.brand, fontWeight: "800" as const, fontSize: 13 * fontScale },
    name: { fontWeight: "800" as const, color: c.foreground, fontSize: 14 * fontScale },
    meta: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
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
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.tintOrange,
    },
    ownerText: { fontSize: 10 * fontScale, fontWeight: "800" as const, color: c.warning },
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
    editHint: { fontSize: 11 * fontScale, color: c.brand, marginTop: 4, fontWeight: "600" as const },
  }));

  const q = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => listFamilyMembers({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const members = q.data?.members ?? [];

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Thành viên" subtitle={family?.name} eyebrow="Gia đình" back="/(tabs)/gia-dinh" />

      <View style={styles.topRow}>
        <Text style={styles.count}>{members.length} thành viên</Text>
        <Pressable
          style={styles.inviteBtn}
          onPress={() =>
            router.push({
              pathname: "/coming-soon",
              params: { feature: "moi-thanh-vien", back: "/gia-dinh/thanh-vien" },
            })
          }
        >
          <UserPlus color={colors.brand} size={16} />
          <Text style={styles.inviteText}>Mời thành viên</Text>
        </Pressable>
      </View>

      {members.map((m) => {
        const name = memberDisplayName(m);
        const isSelf = profile?.id === m.user_id;
        return (
          <Pressable
            key={m.user_id}
            onPress={() => {
              if (isSelf) router.push("/(tabs)/tai-khoan");
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <Card style={styles.row}>
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
                  {isSelf ? <Text style={styles.selfBadge}>Bạn</Text> : null}
                  {!m.is_owner && m.role === "family_owner" ? (
                    <Text style={styles.coOwnerBadge}>Đồng chủ hộ</Text>
                  ) : null}
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {m.email ?? "—"}
                </Text>
                {isSelf ? <Text style={styles.editHint}>Nhấn để sửa thông tin tài khoản</Text> : null}
              </View>
              {m.is_owner ? (
                <View style={styles.ownerBadge}>
                  <Crown color={colors.warning} size={14} />
                  <Text style={styles.ownerText}>Chủ hộ</Text>
                </View>
              ) : isSelf ? (
                <Pencil color={colors.brand} size={18} />
              ) : null}
            </Card>
          </Pressable>
        );
      })}

      <View style={{ height: 24 }} />
    </Screen>
  );
}
