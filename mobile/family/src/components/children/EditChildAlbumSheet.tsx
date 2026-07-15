import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Image as ImageIcon, X } from "lucide-react-native";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { getChildAlbum, updateChildAlbum } from "@mobile/api/child-albums";
import { uploadChildMomentFromUri } from "@mobile/lib/upload-child-moment";
import { toast } from "@mobile/utils/toast";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { usePickChildMomentPhoto } from "@mobile/hooks/usePickChildMomentPhoto";
import { ChildMomentUploadOverlay } from "@mobile/components/children/ChildMomentUploadOverlay";

type Props = {
  visible: boolean;
  albumId: string;
  childId: string;
  onClose: () => void;
};

export function EditChildAlbumSheet({ visible, albumId, childId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { s } = useI18n();
  const ch = s.screens.children;
  const f = ch.form;
  const c = s.common;
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const { pickAndSave, isUploading, uploadProgress } = usePickChildMomentPhoto();

  const q = useQuery({
    queryKey: ["child-album", albumId, familyId],
    queryFn: () => getChildAlbum({ album_id: albumId, family_id: familyId! }),
    enabled: visible && !!albumId && !!familyId,
  });

  useEffect(() => {
    if (!visible) return;
    const album = q.data?.album;
    if (!album) return;
    setTitle(album.title);
    setCoverUrl(album.cover_url);
  }, [visible, q.data?.album]);

  const pickCover = async () => {
    if (!familyId || !childId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(c.photoPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setCoverBusy(true);
    try {
      const { publicUrl } = await uploadChildMomentFromUri(familyId, childId, result.assets[0].uri);
      setCoverUrl(publicUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : c.uploadFailed);
    } finally {
      setCoverBusy(false);
    }
  };

  const save = useMutation({
    mutationFn: () => {
      if (!familyId || !albumId) throw new Error(c.noFamilyYet);
      if (!title.trim()) throw new Error(f.enterTitle);
      return updateChildAlbum({
        id: albumId,
        family_id: familyId,
        title: title.trim(),
        cover_url: coverUrl,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["child-albums", familyId] });
      await qc.invalidateQueries({ queryKey: ["child-album", albumId, familyId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading = visible && q.isLoading && !q.data?.album;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng" />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />

          <View style={styles.topBar}>
            <Pressable style={styles.circleBtn} onPress={onClose} hitSlop={12}>
              <X color={colors.foreground} size={22} />
            </Pressable>
            <Pressable
              style={[styles.circleBtn, styles.saveBtn]}
              onPress={() => save.mutate()}
              disabled={!title.trim() || save.isPending || loading}
              hitSlop={12}
            >
              {save.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Check color={colors.white} size={22} />
              )}
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <LoadingState />
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
            >
              <Pressable style={styles.coverWrap} onPress={() => void pickCover()} disabled={coverBusy}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverEmpty]}>
                    <ImageIcon color={colors.muted} size={36} />
                  </View>
                )}
                <View style={styles.coverBadge}>
                  {coverBusy ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <ImageIcon color={colors.white} size={16} />
                  )}
                </View>
              </Pressable>

              <Pressable
                style={styles.addPhotoBtn}
                disabled={isUploading || !childId || !albumId}
                onPress={() => {
                  if (!childId || !albumId) return;
                  void pickAndSave(childId, albumId);
                }}
              >
                <Text style={styles.addPhotoText}>{ch.addMoment}</Text>
              </Pressable>

              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={ch.albumTitlePh}
                  placeholderTextColor={colors.muted}
                  maxLength={120}
                />
                {title.length > 0 ? (
                  <Pressable style={styles.clearBtn} onPress={() => setTitle("")} hitSlop={8}>
                    <X color={colors.muted} size={16} />
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      <ChildMomentUploadOverlay visible={isUploading} progress={uploadProgress} />
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    overlay: {
      flex: 1,
      justifyContent: "flex-end" as const,
    },
    backdrop: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderBottomWidth: 0,
      maxHeight: "92%",
    },
    handle: {
      alignSelf: "center" as const,
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.mutedBg,
      marginTop: 10,
      marginBottom: 4,
    },
    topBar: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    circleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    saveBtn: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    loadingWrap: {
      minHeight: 280,
      justifyContent: "center" as const,
    },
    body: {
      alignItems: "center" as const,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    coverWrap: {
      width: 200,
      height: 200,
      borderRadius: radius.lg,
      overflow: "hidden" as const,
      position: "relative" as const,
    },
    cover: { width: "100%" as const, height: "100%" as const },
    coverEmpty: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    coverBadge: {
      position: "absolute" as const,
      right: 10,
      bottom: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.brand,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    addPhotoBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    addPhotoText: {
      color: c.brand,
      fontWeight: "700" as const,
      fontSize: 15 * fontScale,
    },
    inputWrap: {
      marginTop: 16,
      width: "100%" as const,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 16,
      minHeight: 52,
    },
    input: {
      flex: 1,
      color: c.foreground,
      fontSize: 16 * fontScale,
      fontWeight: "600" as const,
      paddingVertical: 12,
    },
    clearBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }));
}
