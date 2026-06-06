import { Alert, Image, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Pencil, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { deleteAlbum, getAlbum } from "@mobile/api/albums";
import { toast } from "@mobile/utils/toast";
import { invalidateMomentQueries } from "@mobile/constants/momentQueryKeys";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function AlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useAlbumDetailStyles();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["family-album", albumId, familyId],
    queryFn: () => getAlbum({ album_id: albumId!, family_id: familyId! }),
    enabled: !!albumId && !!familyId,
  });

  const delMut = useMutation({
    mutationFn: () => deleteAlbum({ id: albumId!, family_id: familyId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-albums", familyId] });
      if (familyId) invalidateMomentQueries(qc, familyId);
      toast.success("Đã xóa album");
      router.replace("/ky-niem-gia-dinh/album");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const album = q.data?.album;
  const moments = q.data?.moments ?? [];

  if (q.isLoading) return <Screen><LoadingState /></Screen>;

  if (!album) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title="Album" back="/ky-niem-gia-dinh/album" />
        <EmptyState title="Không tìm thấy album" />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow="Album"
        title={album.title}
        back="/ky-niem-gia-dinh/album"
        right={
          <Pressable onPress={() => router.push(`/ky-niem-gia-dinh/album/sua/${albumId}`)}>
            <Pencil color={colors.brand} size={20} />
          </Pressable>
        }
      />
      <Text style={styles.headerEmoji}>{album.cover_emoji}</Text>
      {album.category ? <Text style={styles.category}>{album.category}</Text> : null}

      <Pressable
        style={styles.uploadBanner}
        onPress={() =>
          router.push({
            pathname: "/ky-niem-gia-dinh/upload",
            params: { album_id: albumId },
          })
        }
      >
        <Camera color={colors.brand} size={20} />
        <Text style={styles.uploadText}>Tải ảnh vào album</Text>
      </Pressable>

      {moments.length === 0 ? (
        <EmptyState
          title="Album trống"
          description="Tải ảnh và gán vào album khi đăng."
          actionLabel="Tải ảnh vào album"
          onAction={() =>
            router.push({
              pathname: "/ky-niem-gia-dinh/upload",
              params: { album_id: albumId },
            })
          }
        />
      ) : (
        <View style={styles.grid}>
          {moments.map((m) => (
            <Pressable key={m.id} style={styles.cell} onPress={() => router.push(`/ky-niem-gia-dinh/${m.id}`)}>
              <Image source={{ uri: m.media_url }} style={styles.img} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        style={styles.delBtn}
        onPress={() =>
          Alert.alert(
            "Xóa album?",
            "Ảnh trong album sẽ không bị xóa, chỉ bỏ gán album.",
            [
              { text: "Huỷ", style: "cancel" },
              { text: "Xóa album", style: "destructive", onPress: () => delMut.mutate() },
            ],
          )
        }
      >
        <Trash2 color={colors.emergency} size={18} />
        <Text style={styles.delText}>Xóa album</Text>
      </Pressable>
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useAlbumDetailStyles() {
  return useThemedStyles((c, fontScale) => ({
    headerEmoji: { fontSize: 28, marginBottom: 8 },
    category: { fontSize: 12 * fontScale, color: c.muted, marginBottom: 12 },
    uploadBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: c.tintOrange,
      padding: 12,
      borderRadius: radius.lg,
      marginBottom: 16,
    },
    uploadText: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
    cell: { width: "48%" as const },
    img: { width: "100%" as const, aspectRatio: 1, borderRadius: radius.md },
    delBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      marginTop: 24,
      paddingVertical: 12,
    },
    delText: { color: c.emergency, fontWeight: "600" as const },
  }));
}
