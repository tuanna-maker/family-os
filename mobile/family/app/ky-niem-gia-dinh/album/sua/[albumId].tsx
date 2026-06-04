import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { getAlbum, updateAlbum } from "@mobile/api/albums";
import { toast } from "@mobile/utils/toast";
export default function AlbumSuaScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [emoji, setEmoji] = useState("📁");

  const q = useQuery({
    queryKey: ["family-album", albumId, familyId],
    queryFn: () => getAlbum({ album_id: albumId!, family_id: familyId! }),
    enabled: !!albumId && !!familyId,
  });

  useEffect(() => {
    const a = q.data?.album;
    if (!a) return;
    setTitle(a.title);
    setCategory(a.category ?? "");
    setEmoji(a.cover_emoji ?? "📁");
  }, [q.data?.album]);

  const save = useMutation({
    mutationFn: () =>
      updateAlbum({
        id: albumId!,
        family_id: familyId!,
        title: title.trim(),
        category: category.trim() || undefined,
        cover_emoji: emoji,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-albums", familyId] });
      qc.invalidateQueries({ queryKey: ["family-album", albumId, familyId] });
      toast.success("Đã lưu album");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Screen><LoadingState /></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Sửa album" back={`/ky-niem-gia-dinh/album/${albumId}`} />
      <TextField label="Tên album" value={title} onChangeText={setTitle} />
      <TextField label="Danh mục" value={category} onChangeText={setCategory} placeholder="Sinh nhật, du lịch…" />
      <TextField label="Emoji bìa" value={emoji} onChangeText={setEmoji} />
      <PrimaryButton
        label="Lưu"
        onPress={() => save.mutate()}
        disabled={!title.trim()}
        loading={save.isPending}
      />
    </Screen>
  );
}
