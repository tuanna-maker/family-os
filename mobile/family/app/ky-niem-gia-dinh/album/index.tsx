import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { deleteAlbum, listAlbums } from "@mobile/api/albums";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import { displayAlbumTitle } from "@mobile/utils/displayContent";
import { toast } from "@mobile/utils/toast";
import { appAlert } from "@mobile/utils/alert";

function albumCategoryLabel(
  category: string | null | undefined,
  categories: Record<string, string>,
  fallback: string,
) {
  if (!category) return fallback;
  return categories[category] ?? category;
}

export default function AlbumListScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useAlbumListStyles();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { locale, s } = useI18n();
  const mem = s.screens.memories;
  const c = s.common;

  const q = useQuery({
    queryKey: ["family-albums", familyId],
    queryFn: () => listAlbums({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const albums = q.data?.albums ?? [];

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAlbum({ id, family_id: familyId! }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["family-albums", familyId] });
      toast.success(c.albumDeleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmDelete = (id: string) => {
    appAlert(c.deleteAlbum, c.deleteAlbumConfirm, [
      { text: c.cancel, style: "cancel" },
      { text: c.deleteAlbum, style: "destructive", onPress: () => delMut.mutate(id) },
    ]);
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow={mem.eyebrow}
        title={mem.albumList}
        back="/ky-niem-gia-dinh"
        right={
          <HeaderIconButton
            variant="primary"
            accessibilityLabel={mem.createAlbum}
            onPress={() => router.push("/ky-niem-gia-dinh/album/tao")}
          >
            <Plus color={colors.white} size={20} />
          </HeaderIconButton>
        }
      />

      {q.isLoading && <LoadingState />}

      {!q.isLoading && albums.length === 0 && (
        <EmptyState
          title={mem.noAlbums}
          description={mem.noAlbumsDesc}
          actionLabel={mem.createFirstAlbum}
          onAction={() => router.push("/ky-niem-gia-dinh/album/tao")}
        />
      )}

      {albums.map((a) => (
        <Pressable key={a.id} onPress={() => router.push(`/ky-niem-gia-dinh/album/${a.id}`)}>
          <Card style={styles.row}>
            <Text style={styles.emoji}>{a.cover_emoji}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>
                {displayAlbumTitle(a.title, locale)}
              </Text>
              <Text style={styles.sub}>
                {mem.albumMeta(
                  albumCategoryLabel(a.category, mem.albumCategories, c.album),
                  a.moment_count ?? 0,
                )}
              </Text>
            </View>

            <View style={styles.rowActions}>
              <Pressable
                style={styles.iconBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/ky-niem-gia-dinh/album/sua/${a.id}`);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={c.edit}
              >
                <Pencil color={colors.brand} size={18} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  confirmDelete(a.id);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={c.deleteAlbum}
              >
                <Trash2 color={colors.emergency} size={18} />
              </Pressable>
              <FolderOpen color={colors.muted} size={18} />
            </View>
          </Card>
        </Pressable>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useAlbumListStyles() {
  return useThemedStyles((c, fontScale) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      marginBottom: 10,
      ...cardShadow(c),
    },
    emoji: { fontSize: 32 },
    title: { fontWeight: "700" as const, fontSize: 16 * fontScale, color: c.foreground },
    sub: { fontSize: 11 * fontScale, color: c.muted, marginTop: 4 },
    rowActions: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
  }));
}
