import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { HeaderIconButton, PageHeader } from "@mobile/components/ui";
import { EmptyState, LoadingState } from "@mobile/components/states";
import {
  ChildAlbumGridCard,
  type ChildAlbumCardAnchor,
} from "@mobile/components/children/ChildAlbumGridCard";
import { ChildAlbumToolsSheet } from "@mobile/components/children/ChildAlbumToolsSheet";
import { ChildMomentUploadOverlay } from "@mobile/components/children/ChildMomentUploadOverlay";
import { EditChildAlbumSheet } from "@mobile/components/children/EditChildAlbumSheet";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { deleteChildAlbum, listChildAlbums, type ChildAlbum } from "@mobile/api/child-albums";
import { listChildren } from "@mobile/api/children";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { spacing } from "@mobile/theme/colors";
import { appAlert } from "@mobile/utils/alert";
import { toast } from "@mobile/utils/toast";
import { usePickChildMomentPhoto } from "@mobile/hooks/usePickChildMomentPhoto";

function paramId(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const GRID_GAP = 10;

export default function ChildAlbumListScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ childId?: string | string[] }>();
  const childId = paramId(params.childId);
  const { colors } = useTheme();
  const styles = useStyles();
  const { s } = useI18n();
  const ch = s.screens.children;
  const c = s.common;
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [toolsAlbum, setToolsAlbum] = useState<ChildAlbum | null>(null);
  const [toolsAnchor, setToolsAnchor] = useState<ChildAlbumCardAnchor | null>(null);
  const [editAlbum, setEditAlbum] = useState<ChildAlbum | null>(null);
  const cardRefs = useRef<Record<string, View | null>>({});
  const { pickAndSave, isUploading, uploadProgress } = usePickChildMomentPhoto();

  const cardSize = useMemo(() => {
    const innerW = screenWidth - spacing.screen * 2;
    const w = Math.floor((innerW - GRID_GAP) / 2);
    return { width: w, height: w };
  }, [screenWidth]);

  const toolsOpen = !!toolsAlbum && !!toolsAnchor;

  const childrenQ = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const albumsQ = useQuery({
    queryKey: ["child-albums", familyId, childId],
    queryFn: () => listChildAlbums({ family_id: familyId!, child_id: childId! }),
    enabled: !!familyId && !!childId,
    staleTime: 0,
  });

  const deleteMut = useMutation({
    mutationFn: (albumId: string) => deleteChildAlbum({ id: albumId, family_id: familyId! }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["child-albums", familyId] });
      toast.success(c.deleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useFocusEffect(
    useCallback(() => {
      if (!familyId || !childId) return;
      void qc.invalidateQueries({ queryKey: ["child-albums", familyId, childId] });
    }, [qc, familyId, childId]),
  );

  const closeTools = () => {
    setToolsAlbum(null);
    setToolsAnchor(null);
  };

  const openTools = (album: ChildAlbum) => {
    const ref = cardRefs.current[album.id];
    if (!ref) {
      setToolsAlbum(album);
      setToolsAnchor({ x: 40, y: 200, width: cardSize.width, height: cardSize.height });
      return;
    }
    ref.measureInWindow((x, y, width, height) => {
      setToolsAnchor({ x, y, width, height });
      setToolsAlbum(album);
    });
  };

  const confirmDelete = (album: ChildAlbum) => {
    appAlert(c.deleteQuestion, `${album.title}\n\n${ch.deleteChildAlbumConfirm}`, [
      { text: c.cancel, style: "cancel" },
      {
        text: c.delete,
        style: "destructive",
        onPress: () => deleteMut.mutate(album.id),
      },
    ]);
  };

  const title = ch.momentsAlbum;
  const albums = albumsQ.data?.albums ?? [];

  if (!familyId || !childId) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={title}
        back="/con-cai"
        right={
          <HeaderIconButton
            variant="primary"
            accessibilityLabel={ch.createChildAlbum}
            onPress={() => router.push(`/con-cai/khoanh-khac/tao?childId=${childId}`)}
          >
            <Plus color={colors.white} size={20} />
          </HeaderIconButton>
        }
      />

      {albumsQ.isLoading ? <LoadingState /> : null}

      {!albumsQ.isLoading && albums.length === 0 ? (
        <EmptyState
          title={ch.noChildAlbums}
          description={ch.noChildAlbumsDesc}
          actionLabel={ch.createFirstChildAlbum}
          onAction={() => router.push(`/con-cai/khoanh-khac/tao?childId=${childId}`)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!toolsOpen}
        >
          {albums.map((a, index) => {
            const isSelected = toolsAlbum?.id === a.id;
            const isLeftCol = index % 2 === 0;
            return (
              <View
                key={a.id}
                ref={(node) => {
                  cardRefs.current[a.id] = node;
                }}
                collapsable={false}
                style={[
                  styles.cell,
                  {
                    width: cardSize.width,
                    marginRight: isLeftCol ? GRID_GAP : 0,
                    opacity: isSelected ? 0 : 1,
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    if (toolsOpen) {
                      closeTools();
                      return;
                    }
                    router.push(`/con-cai/khoanh-khac/${a.id}?childId=${childId}`);
                  }}
                  onLongPress={() => openTools(a)}
                  delayLongPress={380}
                  style={({ pressed }) => [pressed && !toolsOpen && { opacity: 0.9 }]}
                >
                  <ChildAlbumGridCard album={a} width={cardSize.width} height={cardSize.height} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      <ChildAlbumToolsSheet
        album={toolsAlbum}
        anchor={toolsAnchor}
        visible={toolsOpen}
        onClose={closeTools}
        onAddPhoto={() => {
          if (!toolsAlbum || !childId) return;
          void pickAndSave(childId, toolsAlbum.id);
        }}
        onEdit={() => {
          if (!toolsAlbum || !childId) return;
          setEditAlbum(toolsAlbum);
        }}
        onDelete={() => {
          if (!toolsAlbum) return;
          confirmDelete(toolsAlbum);
        }}
      />

      <ChildMomentUploadOverlay visible={isUploading} progress={uploadProgress} />

      <EditChildAlbumSheet
        visible={!!editAlbum && !!childId}
        albumId={editAlbum?.id ?? ""}
        childId={childId ?? ""}
        onClose={() => setEditAlbum(null)}
      />

      <View style={{ height: 32 }} />
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
  }));
}
