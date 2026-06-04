import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createMoment } from "@mobile/api/moments";
import { listAlbums } from "@mobile/api/albums";
import { uploadMomentFromUri } from "@mobile/lib/upload-moment";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

export default function KyNiemUploadScreen() {
  const router = useRouter();
  const { album_id: albumIdParam } = useLocalSearchParams<{ album_id?: string }>();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof albumIdParam === "string" && albumIdParam) setAlbumId(albumIdParam);
  }, [albumIdParam]);

  const albumsQ = useQuery({
    queryKey: ["family-albums", familyId],
    queryFn: () => listAlbums({ family_id: familyId! }),
    enabled: !!familyId,
  });
  const albums = albumsQ.data?.albums ?? [];

  const pickAndUpload = async () => {
    if (!familyId) {
      toast.error("Chưa có gia đình");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Cần quyền truy cập thư viện ảnh");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || !result.assets.length) return;

    setBusy(true);
    try {
      let count = 0;
      const album_id = albumId || undefined;
      for (const asset of result.assets) {
        const { publicUrl } = await uploadMomentFromUri(familyId, asset.uri);
        await createMoment({
          family_id: familyId,
          media_url: publicUrl,
          caption: caption.trim() || undefined,
          album_id,
        });
        count++;
      }
      qc.invalidateQueries({ queryKey: ["moments", familyId] });
      qc.invalidateQueries({ queryKey: ["family-albums", familyId] });
      if (album_id) qc.invalidateQueries({ queryKey: ["family-album", album_id, familyId] });
      toast.success(`Đã tải lên ${count} ảnh`);
      if (album_id) router.replace(`/ky-niem-gia-dinh/album/${album_id}`);
      else router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể tải ảnh");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Kỷ niệm"
        title="Tải ảnh lên"
        back={albumId ? `/ky-niem-gia-dinh/album/${albumId}` : "/ky-niem-gia-dinh"}
      />
      <TextField label="Chú thích (tuỳ chọn)" value={caption} onChangeText={setCaption} placeholder="Kỷ niệm hôm nay…" />

      {albums.length > 0 && (
        <>
          <Text style={styles.label}>Album (tuỳ chọn)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.chips}>
              <Pressable
                style={[styles.chip, !albumId && styles.chipActive]}
                onPress={() => setAlbumId("")}
              >
                <Text style={[styles.chipText, !albumId && styles.chipTextActive]}>Không gán</Text>
              </Pressable>
              {albums.map((a) => (
                <Pressable
                  key={a.id}
                  style={[styles.chip, albumId === a.id && styles.chipActive]}
                  onPress={() => setAlbumId(a.id)}
                >
                  <Text>{a.cover_emoji}</Text>
                  <Text style={[styles.chipText, albumId === a.id && styles.chipTextActive]} numberOfLines={1}>
                    {a.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {busy ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Đang tải lên…</Text>
        </View>
      ) : (
        <PrimaryButton label="Chọn ảnh từ thư viện" onPress={pickAndUpload} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 8 },
  chips: { flexDirection: "row", gap: 8, maxWidth: 320 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxWidth: 160,
  },
  chipActive: { backgroundColor: colors.tintBlue, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: colors.brand },
  loading: { alignItems: "center", gap: 12, paddingVertical: 32 },
  loadingText: { color: colors.muted },
});
