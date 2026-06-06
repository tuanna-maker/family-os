import { Image, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Crown, User } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { listFamilyMembers } from "@mobile/api/family-members";
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
  const { familyId } = useFamilyContext();
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
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
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.tintOrange,
    },
    badgeText: { fontSize: 10 * fontScale, fontWeight: "800" as const, color: c.warning },
  }));

  const q = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => listFamilyMembers({ family_id: familyId! }),
    enabled: !!familyId,
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Thành viên" back="/(tabs)/gia-dinh" />

      {(q.data?.members ?? []).map((m) => (
        <Pressable
          key={m.user_id}
          onPress={() => {}}
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
              <Text style={styles.name} numberOfLines={1}>
                {m.full_name ?? m.username ?? m.email ?? "Thành viên"}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {m.email ?? "—"}
              </Text>
            </View>
            {m.is_owner ? (
              <View style={styles.badge}>
                <Crown color={colors.warning} size={14} />
                <Text style={styles.badgeText}>Chủ hộ</Text>
              </View>
            ) : (
              <User color={colors.muted} size={18} />
            )}
          </Card>
        </Pressable>
      ))}

      <View style={{ height: 24 }} />
    </Screen>
  );
}

