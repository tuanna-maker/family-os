import { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { LoadingState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { addMomentComment, deleteMoment, getMoment, toggleReaction } from "@mobile/api/moments";
import { toast } from "@mobile/utils/toast";

const REACTIONS = ["❤️", "👍", "🎉", "😂", "😮"] as const;

export default function KyNiemDetailScreen() {
  const { momentId } = useLocalSearchParams<{ momentId: string }>();
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const q = useQuery({
    queryKey: ["moment", momentId, familyId],
    queryFn: () => getMoment({ moment_id: momentId!, family_id: familyId! }),
    enabled: !!momentId && !!familyId,
  });

  const reactions = (q.data?.reactions ?? []) as Array<{ emoji: string; user_id?: string }>;
  const reactionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reactions) {
      map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
    }
    return map;
  }, [reactions]);

  const addComment = useMutation({
    mutationFn: () =>
      addMomentComment({ moment_id: momentId!, family_id: familyId!, body: comment.trim() }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["moment", momentId, familyId] });
      toast.success("Đã gửi bình luận");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactMut = useMutation({
    mutationFn: (emoji: string) =>
      toggleReaction({ moment_id: momentId!, family_id: familyId!, emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moment", momentId, familyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteMoment({ id: momentId! }),
    onSuccess: () => {
      const albumId = q.data?.moment?.album_id;
      qc.invalidateQueries({ queryKey: ["moments", familyId] });
      qc.invalidateQueries({ queryKey: ["family-albums", familyId] });
      if (albumId) {
        qc.invalidateQueries({ queryKey: ["family-album", albumId, familyId] });
      }
      toast.success("Đã xóa");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Screen><LoadingState /></Screen>;
  const moment = q.data?.moment;
  if (!moment) return <Screen><Text style={{ color: colors.muted }}>Không tìm thấy.</Text></Screen>;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Kỷ niệm" back="/ky-niem-gia-dinh" />

      <Image source={{ uri: moment.media_url }} style={styles.hero} />
      <Text style={styles.caption}>{(moment.caption ?? "Kỷ niệm").replace(/^\[Pilot\]\s*/, "")}</Text>
      <Text style={styles.date}>{new Date(moment.taken_at).toLocaleString("vi-VN")}</Text>

      <View style={styles.reactRow}>
        {REACTIONS.map((emoji) => {
          const count = reactionCounts.get(emoji) ?? 0;
          return (
            <Pressable
              key={emoji}
              style={[styles.reactBtn, count > 0 && styles.reactBtnActive]}
              onPress={() => reactMut.mutate(emoji)}
              disabled={reactMut.isPending}
            >
              <Text style={styles.reactEmoji}>{emoji}</Text>
              {count > 0 ? <Text style={styles.reactCount}>{count}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.section}>Bình luận</Text>
        {(q.data?.comments as Array<{ body: string }> ?? []).map((c, i) => (
          <Text key={i} style={styles.comment}>{c.body}</Text>
        ))}
        <TextField label="Viết bình luận" value={comment} onChangeText={setComment} />
        <PrimaryButton
          label="Gửi"
          onPress={() => addComment.mutate()}
          disabled={!comment.trim()}
          loading={addComment.isPending}
        />
      </Card>

      <Pressable
        style={styles.delBtn}
        onPress={() =>
          Alert.alert("Xóa kỷ niệm?", "", [
            { text: "Huỷ", style: "cancel" },
            { text: "Xóa", style: "destructive", onPress: () => del.mutate() },
          ])
        }
      >
        <Trash2 color={colors.emergency} size={18} />
        <Text style={styles.delText}>Xóa kỷ niệm</Text>
      </Pressable>
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 280, borderRadius: 16 },
  caption: { fontSize: 18, fontWeight: "800", color: colors.foreground, marginTop: 12 },
  date: { fontSize: 12, color: colors.muted, marginTop: 4 },
  reactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  reactBtn: {
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
  reactBtnActive: { borderColor: colors.brand, backgroundColor: colors.tintBlue },
  reactEmoji: { fontSize: 20 },
  reactCount: { fontSize: 12, fontWeight: "700", color: colors.muted },
  section: { fontWeight: "700", marginBottom: 8, color: colors.foreground },
  comment: { color: colors.muted, marginBottom: 6, fontSize: 14 },
  delBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, justifyContent: "center" },
  delText: { color: colors.emergency, fontWeight: "600" },
});
