import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listAlbums } from "@mobile/api/albums";
import { colors, radius } from "@mobile/theme/colors";

export default function AlbumListScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();

  const q = useQuery({
    queryKey: ["family-albums", familyId],
    queryFn: () => listAlbums({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const albums = q.data?.albums ?? [];

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Kỷ niệm"
        title="Album"
        back="/ky-niem-gia-dinh"
        right={
          <Pressable
            style={styles.addIcon}
            onPress={() => router.push("/ky-niem-gia-dinh/album/tao")}
            accessibilityLabel="Tạo album"
          >
            <Plus color={colors.white} size={22} />
          </Pressable>
        }
      />

      {q.isLoading && <LoadingState />}

      {!q.isLoading && albums.length === 0 && (
        <EmptyState
          title="Chưa có album"
          description="Gom ảnh theo chuyến đi, sinh nhật…"
          actionLabel="Tạo album đầu tiên"
          onAction={() => router.push("/ky-niem-gia-dinh/album/tao")}
        />
      )}

      {albums.map((a) => (
        <Pressable key={a.id} onPress={() => router.push(`/ky-niem-gia-dinh/album/${a.id}`)}>
          <Card style={styles.row}>
            <Text style={styles.emoji}>{a.cover_emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={styles.sub}>
                {a.category ?? "Album"} · {a.moment_count ?? 0} ảnh
              </Text>
            </View>
            <FolderOpen color={colors.muted} size={18} />
          </Card>
        </Pressable>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  emoji: { fontSize: 32 },
  title: { fontWeight: "700", fontSize: 16, color: colors.foreground },
  sub: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
