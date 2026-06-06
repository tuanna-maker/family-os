import { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Lock, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listMoments, type Moment } from "@mobile/api/moments";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

function groupByMonth(moments: Moment[]) {
  const map = new Map<string, Moment[]>();
  for (const m of moments) {
    const d = new Date(m.taken_at);
    const label = `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(m);
  }
  return Array.from(map.entries());
}

export default function KyNiemScreen() {
  const router = useRouter();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    headerActions: { flexDirection: "row" as const, gap: 8 },
    privacy: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: c.tintGreen,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.lg,
      marginBottom: 16,
    },
    privacyText: { fontSize: 11 * fontScale, color: c.success, flex: 1 },
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
    cell: { width: "47.5%" as const, marginBottom: 8 },
    photoCard: { padding: 0, overflow: "hidden" as const },
    photo: { width: "100%" as const, aspectRatio: 1 },
    placeholder: {
      width: "100%" as const,
      aspectRatio: 1,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    caption: {
      fontSize: 11 * fontScale,
      color: c.muted,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    monthBlock: { marginBottom: 20 },
  }));

  const q = useQuery({
    queryKey: ["family-moments", familyId],
    queryFn: () => listMoments({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const grouped = useMemo(() => groupByMonth(q.data?.moments ?? []), [q.data]);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Family Core"
        title="Kỷ niệm gia đình"
        subtitle="Lưu lại từng khoảnh khắc đáng nhớ"
        back="/(tabs)/gia-dinh"
        right={
          <View style={styles.headerActions}>
            <HeaderIconButton
              variant="outline"
              accessibilityLabel="Album"
              onPress={() => router.push("/ky-niem-gia-dinh/album")}
            >
              <FolderOpen color={colors.brand} size={20} />
            </HeaderIconButton>
            <HeaderIconButton
              variant="primary"
              accessibilityLabel="Tải ảnh"
              onPress={() => router.push("/ky-niem-gia-dinh/upload")}
            >
              <Plus color={colors.white} size={20} />
            </HeaderIconButton>
          </View>
        }
      />

      <View style={styles.privacy}>
        <Lock color={colors.success} size={14} />
        <Text style={styles.privacyText}>Riêng tư · Chỉ thành viên gia đình mới xem được</Text>
      </View>

      {famLoading || q.isLoading ? (
        <LoadingState />
      ) : !familyId ? (
        <EmptyState title="Chưa có hộ gia đình" />
      ) : grouped.length === 0 ? (
        <EmptyState
          title="Chưa có ảnh nào"
          description="Tải ảnh đầu tiên lên album gia đình."
          actionLabel="Tải ảnh"
          onAction={() => router.push("/ky-niem-gia-dinh/upload")}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {grouped.map(([month, items]) => (
            <View key={month} style={styles.monthBlock}>
              <SectionHeader title={month} />
              <View style={styles.grid}>
                {items.map((m) => {
                  const caption = (m.caption ?? "").replace(/^\[Pilot\]\s*/, "");
                  return (
                    <Pressable
                      key={m.id}
                      style={styles.cell}
                      onPress={() => router.push(`/ky-niem-gia-dinh/${m.id}`)}
                    >
                      <Card style={styles.photoCard}>
                        {m.media_url ? (
                          <Image source={{ uri: m.media_url }} style={styles.photo} />
                        ) : (
                          <View style={styles.placeholder}>
                            <Text style={{ fontSize: 28 }}>📸</Text>
                          </View>
                        )}
                        {caption ? (
                          <Text style={styles.caption} numberOfLines={1}>
                            {caption}
                          </Text>
                        ) : null}
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {q.isFetching ? (
            <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
          ) : null}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </Screen>
  );
}
