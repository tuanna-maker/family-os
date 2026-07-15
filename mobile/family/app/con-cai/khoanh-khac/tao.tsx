import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createChildAlbum } from "@mobile/api/child-albums";
import { toast } from "@mobile/utils/toast";
import { useI18n } from "@mobile/i18n/useI18n";

function paramId(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CreateChildAlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string | string[] }>();
  const childId = paramId(params.childId);
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { s } = useI18n();
  const ch = s.screens.children;
  const f = ch.form;
  const c = s.common;
  const [title, setTitle] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!familyId || !childId) throw new Error(c.noFamilyYet);
      if (!title.trim()) throw new Error(f.enterTitle);
      return createChildAlbum({
        family_id: familyId,
        child_id: childId,
        title: title.trim(),
      });
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["child-albums", familyId] });
      router.replace(`/con-cai/khoanh-khac/${res.album.id}?childId=${childId}`);
      toast.success(ch.albumCreated);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!familyId || !childId) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={ch.createChildAlbum} back={`/con-cai/khoanh-khac?childId=${childId}`} />
      <TextField
        label={ch.momentTitle}
        value={title}
        onChangeText={setTitle}
        placeholder={ch.albumTitlePh}
      />
      <PrimaryButton
        label={ch.createChildAlbum}
        onPress={() => mut.mutate()}
        loading={mut.isPending}
        disabled={!title.trim()}
      />
    </Screen>
  );
}
