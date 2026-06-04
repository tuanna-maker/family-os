import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createAlbum } from "@mobile/api/albums";
import { albumCategories, type AlbumCategory } from "@mobile/constants/album-categories";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

export default function TaoAlbumScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AlbumCategory>("Ngày đặc biệt");

  const mut = useMutation({
    mutationFn: () => {
      const cat = albumCategories.find((c) => c.key === category);
      return createAlbum({
        family_id: familyId!,
        title: title.trim(),
        category,
        cover_emoji: cat?.emoji ?? "📁",
      });
    },
    onSuccess: (res) => {
      toast.success("Đã tạo album");
      router.replace(`/ky-niem-gia-dinh/album/${res.album.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Kỷ niệm" title="Tạo album" back="/ky-niem-gia-dinh/album" />
      <TextField label="Tên album" value={title} onChangeText={setTitle} placeholder="Chuyến đi Phú Quốc" />
      <Text style={styles.label}>Danh mục</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chips}>
          {albumCategories.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text>{c.emoji}</Text>
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.key}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <PrimaryButton
        label="Tạo album"
        onPress={() => {
          if (!title.trim()) {
            toast.error("Vui lòng nhập tên album");
            return;
          }
          if (!familyId) {
            toast.error("Chưa có gia đình");
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

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 8 },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: { backgroundColor: colors.tintBlue, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: colors.brand },
});
