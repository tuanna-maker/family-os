import { useMemo, useState } from "react";

import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";

import { appAlert } from "@mobile/utils/alert";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Trash2 } from "lucide-react-native";

import { Screen } from "@mobile/components/Screen";

import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";

import { LoadingState } from "@mobile/components/states";

import { useFamilyContext } from "@mobile/hooks/useFamilyContext";

import { addMomentComment, deleteMoment, getMoment, toggleReaction } from "@mobile/api/moments";

import { invalidateMomentQueries, momentQueryKeys } from "@mobile/constants/momentQueryKeys";

import { toast } from "@mobile/utils/toast";

import { useTheme } from "@mobile/theme/themeStore";

import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { radius } from "@mobile/theme/colors";

import { useI18n } from "@mobile/i18n/useI18n";

import { formatDateTime } from "@mobile/i18n/format";



const REACTIONS = ["❤️", "👍", "🎉", "😂", "😮"] as const;



export default function KyNiemDetailScreen() {

  const { momentId } = useLocalSearchParams<{ momentId: string }>();

  const router = useRouter();

  const { familyId } = useFamilyContext();

  const { colors } = useTheme();

  const styles = useDetailStyles();

  const qc = useQueryClient();

  const { locale, s } = useI18n();

  const mem = s.screens.memories;

  const c = s.common;

  const [comment, setComment] = useState("");



  const q = useQuery({

    queryKey: momentQueryKeys(familyId).detail(momentId!),

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

      qc.invalidateQueries({ queryKey: momentQueryKeys(familyId).detail(momentId!) });

      toast.success(c.commentSent);

    },

    onError: (e: Error) => toast.error(e.message),

  });



  const reactMut = useMutation({

    mutationFn: (emoji: string) =>

      toggleReaction({ moment_id: momentId!, family_id: familyId!, emoji }),

    onSuccess: () => qc.invalidateQueries({ queryKey: momentQueryKeys(familyId).detail(momentId!) }),

    onError: (e: Error) => toast.error(e.message),

  });



  const del = useMutation({

    mutationFn: () => deleteMoment({ id: momentId! }),

    onSuccess: () => {

      const albumId = q.data?.moment?.album_id;

      if (familyId) invalidateMomentQueries(qc, familyId);

      if (albumId) qc.invalidateQueries({ queryKey: ["family-album", albumId, familyId] });

      toast.success(c.deleted);

      router.back();

    },

    onError: (e: Error) => toast.error(e.message),

  });



  if (q.isLoading) {

    return (

      <Screen>

        <LoadingState />

      </Screen>

    );

  }



  const moment = q.data?.moment;

  if (!moment) {

    return (

      <Screen contentStyle={{ paddingTop: 0 }}>

        <PageHeader title={c.memory} back="/ky-niem-gia-dinh" />

        <Text style={styles.muted}>{c.notFound}</Text>

      </Screen>

    );

  }



  const caption = (moment.caption ?? c.memory).replace(/^\[Pilot\]\s*/, "");



  return (

    <Screen contentStyle={{ paddingTop: 0 }}>

      <PageHeader title={c.memory} back="/ky-niem-gia-dinh" />



      <Image source={moment.media_url} style={styles.hero} cachePolicy="memory-disk" transition={180} />

      <Text style={styles.caption}>{caption}</Text>

      <Text style={styles.date}>{formatDateTime(moment.taken_at, locale)}</Text>



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

        <Text style={styles.section}>{c.comment}</Text>

        {(q.data?.comments as Array<{ body: string }> ?? []).map((item, i) => (

          <Text key={i} style={styles.comment}>

            {item.body}

          </Text>

        ))}

        <TextField label={c.writeComment} value={comment} onChangeText={setComment} />

        <PrimaryButton

          label={c.send}

          onPress={() => addComment.mutate()}

          disabled={!comment.trim()}

          loading={addComment.isPending}

        />

      </Card>



      <Pressable

        style={styles.delBtn}

        onPress={() =>

          appAlert(mem.deleteMoment, "", [

            { text: c.cancel, style: "cancel" },

            { text: c.delete, style: "destructive", onPress: () => del.mutate() },

          ])

        }

      >

        <Trash2 color={colors.emergency} size={18} />

        <Text style={styles.delText}>{mem.deleteMemory}</Text>

      </Pressable>

      <View style={{ height: 32 }} />

    </Screen>

  );

}



function useDetailStyles() {

  return useThemedStyles((c, fontScale) => ({

    hero: { width: "100%" as const, height: 280, borderRadius: radius.xl },

    caption: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 12 },

    date: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },

    muted: { color: c.muted, fontSize: 14 * fontScale },

    reactRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginTop: 12 },

    reactBtn: {

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

    reactBtnActive: { borderColor: c.brand, backgroundColor: c.tintBlue },

    reactEmoji: { fontSize: 20 },

    reactCount: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.muted },

    section: { fontWeight: "700" as const, marginBottom: 8, color: c.foreground, fontSize: 15 * fontScale },

    comment: { color: c.muted, marginBottom: 6, fontSize: 14 * fontScale },

    delBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginTop: 20, justifyContent: "center" as const },

    delText: { color: c.emergency, fontWeight: "600" as const },

  }));

}


