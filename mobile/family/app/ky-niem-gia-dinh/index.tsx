import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Lock, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listMoments, type Moment } from "@mobile/api/moments";
import { momentQueryKeys } from "@mobile/constants/momentQueryKeys";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";

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

function MomentThumb({
  moment,
  caption,
  onPress,
}: {
  moment: Moment;
  caption: string;
  onPress: () => void;
}) {
  const styles = useKyNiemStyles();
  const { colors } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = moment.media_url && !imgFailed;

  return (
    <Pressable style={styles.cell} onPress={onPress}>
      <Card style={styles.photoCard}>
        {showImage ? (
          <Image
            source={{ uri: moment.media_url }}
            style={styles.photo}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>📸</Text>
            {caption ? (
              <Text style={styles.placeholderCaption} numberOfLines={2}>
                {caption}
              </Text>
            ) : null}
          </View>
        )}
        {caption && showImage ? (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function KyNiemScreen() {
  const router = useRouter();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const { colors } = useTheme();
  const styles = useKyNiemStyles();

  const q = useQuery({
    queryKey: momentQueryKeys(familyId).list,
    queryFn: () => listMoments({ family_id: familyId! }),
    enabled: !!familyId,
  });

  useFocusEffect(
    useCallback(() => {
      if (familyId) void q.refetch();
    }, [familyId, q.refetch]),
  );

  const grouped = useMemo(() => groupByMonth(q.data?.moments ?? []), [q.data]);

  const onRefresh = useCallback(() => {
    void q.refetch();
  }, [q.refetch]);

  return (
    <Screen scroll={false} contentStyle={{ paddingTop: 0 }}>
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={onRefresh} tintColor={colors.brand} />}
        >
          {grouped.map(([month, items]) => (
            <View key={month} style={styles.monthBlock}>
              <SectionHeader title={month} />
              <View style={styles.grid}>
                {items.map((m) => {
                  const caption = (m.caption ?? "").replace(/^\[Pilot\]\s*/, "");
                  return (
                    <MomentThumb
                      key={m.id}
                      moment={m}
                      caption={caption}
                      onPress={() => router.push(`/ky-niem-gia-dinh/${m.id}`)}
                    />
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

function useKyNiemStyles() {
  return useThemedStyles((c, fontScale) => ({
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
    photoCard: { padding: 0, overflow: "hidden" as const, ...cardShadow(c) },
    photo: { width: "100%" as const, aspectRatio: 1 },
    placeholder: {
      width: "100%" as const,
      aspectRatio: 1,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 12,
      gap: 6,
    },
    placeholderEmoji: { fontSize: 28 },
    placeholderCaption: {
      fontSize: 11 * fontScale,
      color: c.muted,
      textAlign: "center" as const,
    },
    caption: {
      fontSize: 11 * fontScale,
      color: c.foreground,
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontWeight: "600" as const,
    },
    monthBlock: { marginBottom: 20 },
  }));
}
