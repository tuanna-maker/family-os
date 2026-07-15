import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";

// delete album UI removed from this screen

import { useLocalSearchParams, useRouter } from "expo-router";

import { useQuery } from "@tanstack/react-query";

import { Camera } from "lucide-react-native";

import { Screen } from "@mobile/components/Screen";

import { Card, PageHeader } from "@mobile/components/ui";

import { EmptyState, LoadingState } from "@mobile/components/states";

import { useFamilyContext } from "@mobile/hooks/useFamilyContext";

import { getAlbum } from "@mobile/api/albums";

import { useSignedStorageUrls } from "@mobile/hooks/useSignedStorageUrls";

//

import { useTheme } from "@mobile/theme/themeStore";

import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { radius } from "@mobile/theme/colors";

import { useI18n } from "@mobile/i18n/useI18n";
import { displayAlbumTitle } from "@mobile/utils/displayContent";
import { resolveMomentThumbUrl } from "@mobile/utils/momentMedia";



function albumCategoryLabel(

  category: string | null | undefined,

  categories: Record<string, string>,

) {

  if (!category) return null;

  return categories[category] ?? category;

}



export default function AlbumDetailScreen() {

  const { albumId } = useLocalSearchParams<{ albumId: string }>();

  const router = useRouter();

  const { colors } = useTheme();

  const styles = useAlbumDetailStyles();

  const { familyId } = useFamilyContext();

  const { locale, s } = useI18n();

  const mem = s.screens.memories;

  const c = s.common;



  const q = useQuery({

    queryKey: ["family-album", albumId, familyId],

    queryFn: () => getAlbum({ album_id: albumId!, family_id: familyId! }),

    enabled: !!albumId && !!familyId,

  });



  // delete album action removed from this screen (handled in album list)



  const album = q.data?.album;

  const moments = q.data?.moments ?? [];

  const signed = useSignedStorageUrls(
    "family-moments",
    moments.flatMap((m) => [m.thumbnail_url, m.media_url]),
  );

  const thumbByMoment = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of moments) {
      map.set(m.id, resolveMomentThumbUrl(m.media_url, m.thumbnail_url, signed.data, 320));
    }
    return map;
  }, [moments, signed.data]);



  if (q.isLoading) return <Screen><LoadingState /></Screen>;



  if (!album) {

    return (

      <Screen contentStyle={{ paddingTop: 0 }}>

        <PageHeader title={mem.albumList} back="/ky-niem-gia-dinh/album" />

        <EmptyState title={mem.albumNotFound} />

      </Screen>

    );

  }



  const categoryLabel = albumCategoryLabel(album.category, mem.albumCategories);



  return (

    <Screen contentStyle={{ paddingTop: 0 }}>

      <PageHeader

        title={`${album.cover_emoji} ${displayAlbumTitle(album.title, locale)}${categoryLabel ? ` · ${categoryLabel}` : ""}`}

        back="/ky-niem-gia-dinh/album"
        alignTitleWithContent

      />

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
        <Text style={styles.uploadText}>{c.uploadToAlbum}</Text>
      </Pressable>

      {moments.length === 0 ? (

        <EmptyState

          title={c.emptyAlbum}

          description={c.emptyAlbumDesc}

        />

      ) : (

        <View style={styles.grid}>

          {moments.map((m) => (

            <Pressable key={m.id} style={styles.cell} onPress={() => router.push(`/ky-niem-gia-dinh/${m.id}`)}>

              <Image
                source={thumbByMoment.get(m.id) ?? m.media_url}
                style={styles.img}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={180}
                recyclingKey={m.id}
              />

            </Pressable>

          ))}

        </View>

      )}



      <View style={{ height: 32 }} />

    </Screen>

  );

}



function useAlbumDetailStyles() {

  return useThemedStyles((c, fontScale) => ({
    uploadBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: c.tintOrange,
      padding: 12,
      borderRadius: radius.lg,
      marginTop: 12,
      marginBottom: 16,
    },
    uploadText: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },

    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },

    cell: { width: "48%" as const },

    img: { width: "100%" as const, aspectRatio: 1, borderRadius: radius.md },

  }));

}


