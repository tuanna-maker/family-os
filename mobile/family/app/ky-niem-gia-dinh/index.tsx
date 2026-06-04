import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, FolderOpen, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listMoments } from "@mobile/api/moments";
import { listAlbums } from "@mobile/api/albums";
import { colors, radius } from "@mobile/theme/colors";

export default function KyNiemScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const q = useQuery({
    queryKey: ["moments", familyId],
    queryFn: () => listMoments({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const albumsQ = useQuery({
    queryKey: ["family-albums", familyId],
    queryFn: () => listAlbums({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const albums = albumsQ.data?.albums ?? [];
  const recentAlbums = albums.slice(0, 4);

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Kỷ niệm gia đình" back="/(tabs)/gia-dinh" />

      <Pressable style={styles.albumBanner} onPress={() => router.push("/ky-niem-gia-dinh/album")}>
        <FolderOpen color={colors.brand} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={styles.uploadText}>Album gia đình</Text>
          <Text style={styles.albumSub}>
            {albums.length > 0 ? `${albums.length} album` : "Gom ảnh theo chủ đề"}
          </Text>
        </View>
      </Pressable>

      {recentAlbums.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.albumRow}>
            {recentAlbums.map((a) => (
              <Pressable
                key={a.id}
                style={styles.albumChip}
                onPress={() => router.push(`/ky-niem-gia-dinh/album/${a.id}`)}
              >
                <Text style={styles.albumEmoji}>{a.cover_emoji}</Text>
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={styles.albumCount}>{a.moment_count ?? 0} ảnh</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Pressable style={styles.uploadBanner} onPress={() => router.push("/ky-niem-gia-dinh/upload")}>
        <Camera color={colors.brand} size={22} />
        <Text style={styles.uploadText}>Tải ảnh lên</Text>
      </Pressable>

      {(q.data?.moments ?? []).length === 0 ? (
        <Card>
          <Text style={{ color: colors.muted }}>Chưa có kỷ niệm nào.</Text>
        </Card>
      ) : (
        (q.data?.moments ?? []).map((m) => (
          <Pressable key={m.id} onPress={() => router.push(`/ky-niem-gia-dinh/${m.id}`)}>
            <Card style={styles.row}>
              <Image source={{ uri: m.media_url }} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {(m.caption ?? "Kỷ niệm").replace(/^\[Pilot\]\s*/, "")}
                </Text>
                <Text style={styles.sub}>{new Date(m.taken_at).toLocaleDateString("vi-VN")}</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <Pressable style={styles.fab} onPress={() => router.push("/ky-niem-gia-dinh/upload")}>
        <Plus color={colors.white} size={24} />
      </Pressable>
      <View style={{ height: 48 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  albumBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.tintBlue,
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 12,
  },
  albumSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  albumRow: { flexDirection: "row", gap: 10, paddingBottom: 4 },
  albumChip: {
    width: 120,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  albumEmoji: { fontSize: 28 },
  albumTitle: { fontWeight: "700", fontSize: 13, color: colors.foreground, marginTop: 6 },
  albumCount: { fontSize: 10, color: colors.muted, marginTop: 2 },
  uploadBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.tintOrange,
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  uploadText: { fontWeight: "700", color: colors.foreground },
  row: { flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  title: { fontWeight: "700", color: colors.foreground, fontSize: 16 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
});
