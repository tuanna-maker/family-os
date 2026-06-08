import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listAlbums } from "@mobile/api/albums";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import { displayAlbumTitle } from "@mobile/utils/displayContent";

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
  const { locale, s } = useI18n();
  const mem = s.screens.memories;
  const c = s.common;

  const q = useQuery({
    queryKey: ["family-albums", familyId],
    queryFn: () => listAlbums({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const albums = q.data?.albums ?? [];

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
            <View style={{ flex: 1 }}>
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
            <FolderOpen color={colors.muted} size={18} />
          </Card>
        </Pressable>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useAlbumListStyles() {
  return useThemedStyles((c, fontScale) => ({
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 10, ...cardShadow(c) },
    emoji: { fontSize: 32 },
    title: { fontWeight: "700" as const, fontSize: 16 * fontScale, color: c.foreground },
    sub: { fontSize: 11 * fontScale, color: c.muted, marginTop: 4 },
  }));
}
