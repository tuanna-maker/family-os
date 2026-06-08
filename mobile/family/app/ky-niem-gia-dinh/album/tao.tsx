import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createAlbum } from "@mobile/api/albums";
import { albumCategories, type AlbumCategory } from "@mobile/constants/album-categories";
import { toast } from "@mobile/utils/toast";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";

export default function TaoAlbumScreen() {
  const styles = useTaoAlbumStyles();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const { s } = useI18n();
  const mem = s.screens.memories;
  const c = s.common;
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AlbumCategory>("Ngày đặc biệt");

  const mut = useMutation({
    mutationFn: () => {
      const cat = albumCategories.find((item) => item.key === category);
      return createAlbum({
        family_id: familyId!,
        title: title.trim(),
        category,
        cover_emoji: cat?.emoji ?? "📁",
      });
    },
    onSuccess: (res) => {
      toast.success(mem.albumCreated);
      router.replace(`/ky-niem-gia-dinh/album/${res.album.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={mem.eyebrow} title={mem.createAlbum} back="/ky-niem-gia-dinh/album" />
      <TextField label={mem.albumTitle} value={title} onChangeText={setTitle} placeholder={mem.albumTitlePh} />
      <Text style={styles.label}>{mem.categoryLabel}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chips}>
          {albumCategories.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.chip, category === item.key && styles.chipActive]}
              onPress={() => setCategory(item.key)}
            >
              <Text>{item.emoji}</Text>
              <Text style={[styles.chipText, category === item.key && styles.chipTextActive]}>
                {mem.albumCategories[item.key]}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <PrimaryButton
        label={mem.createAlbum}
        onPress={() => {
          if (!title.trim()) {
            toast.error(mem.enterAlbumName);
            return;
          }
          if (!familyId) {
            toast.error(c.noFamilyYet);
            return;
          }
          mut.mutate();
        }}
        disabled={!title.trim() || mut.isPending}
        loading={mut.isPending}
      />
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useTaoAlbumStyles() {
  return useThemedStyles((c, fontScale) => ({
    label: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, marginBottom: 8 },
    chips: { flexDirection: "row" as const, gap: 8 },
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
    },
    chipActive: { backgroundColor: c.tintBlue, borderColor: c.brand },
    chipText: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.muted },
    chipTextActive: { color: c.brand },
  }));
}
