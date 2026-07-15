import { useEffect, useState } from "react";

import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useTheme } from "@mobile/theme/themeStore";

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

import { invalidateMomentQueries } from "@mobile/constants/momentQueryKeys";

import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { radius } from "@mobile/theme/colors";

import { useI18n } from "@mobile/i18n/useI18n";

import { displayAlbumTitle } from "@mobile/utils/displayContent";



export default function KyNiemUploadScreen() {

  const { colors } = useTheme();

  const styles = useUploadStyles();

  const router = useRouter();

  const { album_id: albumIdParam } = useLocalSearchParams<{ album_id?: string }>();

  const { familyId } = useFamilyContext();

  const qc = useQueryClient();

  const { locale, s } = useI18n();

  const mem = s.screens.memories;

  const c = s.common;

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



  const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {

    if (!familyId) {

      toast.error(c.noFamilyYet);

      return;

    }

    if (!assets.length) return;



    setBusy(true);

    try {

      let count = 0;

      const album_id = albumId || undefined;

      for (const asset of assets) {

        const { publicUrl } = await uploadMomentFromUri(familyId, asset.uri);

        await createMoment({

          family_id: familyId,

          media_url: publicUrl,

          caption: caption.trim() || undefined,

          album_id,

        });

        count++;

      }

      invalidateMomentQueries(qc, familyId);

      qc.invalidateQueries({ queryKey: ["family-albums", familyId] });

      if (album_id) qc.invalidateQueries({ queryKey: ["family-album", album_id, familyId] });

      toast.success(mem.photosUploaded(count));

      if (album_id) router.replace(`/ky-niem-gia-dinh/album/${album_id}`);

      else router.back();

    } catch (e) {

      toast.error(e instanceof Error ? e.message : mem.uploadFailed);

    } finally {

      setBusy(false);

    }

  };



  const pickFromLibrary = async () => {

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {

      toast.error(mem.needLibrary);

      return;

    }

    const result = await ImagePicker.launchImageLibraryAsync({

      mediaTypes: ImagePicker.MediaTypeOptions.Images,

      quality: 0.85,

      allowsMultipleSelection: true,

      selectionLimit: 10,

    });

    if (result.canceled || !result.assets.length) return;

    await uploadAssets(result.assets);

  };



  const takePhoto = async () => {

    const perm = await ImagePicker.requestCameraPermissionsAsync();

    if (!perm.granted) {

      toast.error(mem.needLibrary);

      return;

    }

    const result = await ImagePicker.launchCameraAsync({

      mediaTypes: ImagePicker.MediaTypeOptions.Images,

      quality: 0.85,

    });

    if (result.canceled || !result.assets.length) return;

    await uploadAssets(result.assets);

  };



  return (

    <Screen contentStyle={{ paddingTop: 0 }}>

      <PageHeader

        eyebrow={mem.eyebrow}

        title={mem.uploadPageTitle}

        back={albumId ? `/ky-niem-gia-dinh/album/${albumId}` : "/ky-niem-gia-dinh"}

      />

      <TextField label={mem.captionOptional} value={caption} onChangeText={setCaption} placeholder={mem.captionPh} />



      {albums.length > 0 && (

        <>

          <Text style={styles.label}>{mem.albumOptional}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>

            <View style={styles.chips}>

              <Pressable

                style={[styles.chip, !albumId && styles.chipActive]}

                onPress={() => setAlbumId("")}

              >

                <Text style={[styles.chipText, !albumId && styles.chipTextActive]}>{mem.noAlbumAssign}</Text>

              </Pressable>

              {albums.map((a) => (

                <Pressable

                  key={a.id}

                  style={[styles.chip, albumId === a.id && styles.chipActive]}

                  onPress={() => setAlbumId(a.id)}

                >

                  <Text>{a.cover_emoji}</Text>

                  <Text style={[styles.chipText, albumId === a.id && styles.chipTextActive]} numberOfLines={1}>

                    {displayAlbumTitle(a.title, locale)}

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

          <Text style={styles.loadingText}>{mem.uploading}</Text>

        </View>

      ) : (

        <View style={styles.actions}>

          <PrimaryButton label={mem.pickFromLibrary} onPress={pickFromLibrary} />

          <Pressable style={styles.secondaryBtn} onPress={takePhoto}>

            <Text style={styles.secondaryBtnText}>{mem.takePhoto}</Text>

          </Pressable>

        </View>

      )}

    </Screen>

  );

}



function useUploadStyles() {

  return useThemedStyles((c, fontScale) => ({

    label: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, marginBottom: 8 },

    chips: { flexDirection: "row" as const, gap: 8, maxWidth: 320 },

    chip: {

      flexDirection: "row" as const,

      alignItems: "center" as const,

      gap: 4,

      paddingHorizontal: 12,

      paddingVertical: 8,

      borderRadius: radius.lg,

      backgroundColor: c.card,

      borderWidth: 1,

      borderColor: c.cardBorder,

      maxWidth: 160,

    },

    chipActive: { backgroundColor: c.tintBlue, borderColor: c.brand },

    chipText: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.muted },

    chipTextActive: { color: c.brand },

    loading: { alignItems: "center" as const, gap: 12, paddingVertical: 32 },

    loadingText: { color: c.muted, fontSize: 14 * fontScale },

    actions: { gap: 10 },

    secondaryBtn: {

      alignItems: "center" as const,

      justifyContent: "center" as const,

      paddingVertical: 14,

      borderRadius: radius.lg,

      borderWidth: 1,

      borderColor: c.cardBorder,

      backgroundColor: c.card,

    },

    secondaryBtnText: { fontSize: 15 * fontScale, fontWeight: "700" as const, color: c.foreground },

  }));

}

