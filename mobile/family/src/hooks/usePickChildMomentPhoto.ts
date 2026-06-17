import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { createChildMoment } from "@mobile/api/child-moments";
import { uploadChildMomentFromUri } from "@mobile/lib/upload-child-moment";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";

export type ChildMomentUploadProgress = {
  current: number;
  total: number;
};

export function usePickChildMomentPhoto() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { s } = useI18n();
  const ch = s.screens.children;
  const c = s.common;
  const [uploadProgress, setUploadProgress] = useState<ChildMomentUploadProgress | null>(null);

  const uploadMut = useMutation({
    mutationFn: async ({
      childId,
      albumId,
      uris,
    }: {
      childId: string;
      albumId: string;
      uris: string[];
    }) => {
      if (!familyId) throw new Error(c.noFamilyYet);
      setUploadProgress({ current: 0, total: uris.length });
      let count = 0;
      for (const uri of uris) {
        const { publicUrl } = await uploadChildMomentFromUri(familyId, childId, uri);
        await createChildMoment({
          family_id: familyId,
          child_id: childId,
          album_id: albumId,
          media_url: publicUrl,
          thumbnail_url: publicUrl,
        });
        count++;
        setUploadProgress({ current: count, total: uris.length });
      }
      return count;
    },
    onSuccess: async (count, vars) => {
      await qc.invalidateQueries({ queryKey: ["child-moments", familyId] });
      await qc.invalidateQueries({ queryKey: ["child-albums", familyId] });
      await qc.invalidateQueries({ queryKey: ["child-album", vars.albumId, familyId] });
      toast.success(count === 1 ? ch.momentSaved : ch.momentsSavedCount.replace("{count}", String(count)));
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setUploadProgress(null),
  });

  const pickAndSave = async (childId: string, albumId: string): Promise<boolean> => {
    if (!familyId) {
      toast.error(c.noFamilyYet);
      return false;
    }
    if (uploadMut.isPending) return false;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(c.photoPermission);
      return false;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 20,
    });
    if (result.canceled || !result.assets.length) return false;

    const uris = result.assets.map((a) => a.uri).filter(Boolean);
    if (!uris.length) return false;

    try {
      await uploadMut.mutateAsync({ childId, albumId, uris });
      return true;
    } catch {
      return false;
    }
  };

  return {
    pickAndSave,
    isUploading: uploadMut.isPending,
    uploadProgress,
  };
}
