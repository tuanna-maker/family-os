import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, ScrollView } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import { ChildMomentUploadOverlay } from "@mobile/components/children/ChildMomentUploadOverlay";
import { ChildMomentImageViewer } from "@mobile/components/children/ChildMomentImageViewer";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useLayoutInfo } from "@mobile/hooks/useLayoutInfo";
import { getChildAlbum } from "@mobile/api/child-albums";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius, spacing } from "@mobile/theme/colors";
import { usePickChildMomentPhoto } from "@mobile/hooks/usePickChildMomentPhoto";
import { useSignedStorageUrls } from "@mobile/hooks/useSignedStorageUrls";

function paramId(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const GRID_GAP = 6;
const MIN_CELL_PORTRAIT = 72;
const MIN_CELL_LANDSCAPE = 64;

function useResponsiveGrid() {
  const { width, isLandscape, contentMaxWidth } = useLayoutInfo();

  return useMemo(() => {
    const layoutW = isLandscape ? Math.min(width, contentMaxWidth) : width;
    const innerW = layoutW - spacing.screen * 2;
    const minCell = isLandscape ? MIN_CELL_LANDSCAPE : MIN_CELL_PORTRAIT;
    const maxCols = isLandscape ? 10 : 6;
    const cols = Math.max(3, Math.min(maxCols, Math.floor((innerW + GRID_GAP) / (minCell + GRID_GAP))));
    const cellSize = Math.floor((innerW - GRID_GAP * (cols - 1)) / cols);
    return { cols, cellSize };
  }, [width, isLandscape, contentMaxWidth]);
}

export default function ChildAlbumDetailScreen() {
  const { cols: gridCols, cellSize } = useResponsiveGrid();
  const params = useLocalSearchParams<{ albumId: string | string[]; childId?: string | string[] }>();
  const albumId = paramId(params.albumId);
  const childId = paramId(params.childId);
  const { colors } = useTheme();
  const styles = useStyles();
  const { s } = useI18n();
  const ch = s.screens.children;
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { pickAndSave, isUploading, uploadProgress } = usePickChildMomentPhoto();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ["child-album", albumId, familyId],
    queryFn: () => getChildAlbum({ album_id: albumId!, family_id: familyId! }),
    enabled: !!familyId && !!albumId,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      if (!familyId || !albumId) return;
      void qc.invalidateQueries({ queryKey: ["child-album", albumId, familyId] });
    }, [qc, familyId, albumId]),
  );

  const album = q.data?.album;
  const moments = q.data?.moments ?? [];
  const signed = useSignedStorageUrls(
    "child-moments",
    moments.map((m) => {
      const row = m as { media_url: string; thumbnail_url?: string | null };
      return row.thumbnail_url ?? row.media_url;
    }),
  );
  const viewerImages = useMemo(
    () =>
      moments.map((m) => {
        const row = m as { id: string; media_url: string; thumbnail_url?: string | null };
        const original = row.media_url || row.thumbnail_url || "";
        const uri = (signed.data?.get(original) ?? original) || "";
        return { id: row.id, uri };
      }),
    [moments, signed.data],
  );
  const back = childId ? `/con-cai/khoanh-khac?childId=${childId}` : "/con-cai";
  const resolvedChildId = album?.child_id ?? childId;

  const addPhoto = () => {
    if (!resolvedChildId || !albumId || isUploading) return;
    void pickAndSave(resolvedChildId, albumId);
  };

  if (!familyId || !albumId) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={album?.title ?? ch.momentsAlbum}
        back={back}
        right={
          <HeaderIconButton
            variant="primary"
            accessibilityLabel={ch.addMoment}
            onPress={addPhoto}
            disabled={isUploading}
          >
            <Plus color={colors.white} size={20} />
          </HeaderIconButton>
        }
      />

      {q.isLoading ? <LoadingState /> : null}

      {!q.isLoading && moments.length === 0 && !isUploading ? (
        <EmptyState
          title={ch.childMomentsEmpty}
          description={ch.childMomentsEmptyDesc}
          actionLabel={ch.addMoment}
          onAction={addPhoto}
        />
      ) : null}

      {!q.isLoading && (moments.length > 0 || isUploading) ? (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {moments.map((m, index) => {
            const row = m as {
              id: string;
              media_url: string;
              thumbnail_url?: string | null;
            };
            const col = index % gridCols;
            const original = row.thumbnail_url ?? row.media_url;
            const uri = (signed.data?.get(original) ?? original) || "";
            return (
              <Pressable
                key={row.id}
                onPress={() => setViewerIndex(index)}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    marginRight: col < gridCols - 1 ? GRID_GAP : 0,
                  },
                ]}
              >
                <Image
                  source={{ uri }}
                  style={[styles.img, { width: cellSize, height: cellSize }]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <ChildMomentUploadOverlay visible={isUploading} progress={uploadProgress} />

      <ChildMomentImageViewer
        visible={viewerIndex !== null}
        images={viewerImages}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles(() => ({
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      paddingBottom: 24,
    },
    cell: {
      marginBottom: GRID_GAP,
    },
    img: {
      borderRadius: radius.sm,
      backgroundColor: "rgba(128,128,128,0.15)",
    },
  }));
}
