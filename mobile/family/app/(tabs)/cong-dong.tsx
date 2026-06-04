import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listCommunityEvents, listCommunityServices, registerCommunityEvent } from "@mobile/api/community";
import { toast } from "@mobile/utils/toast";

export default function CongDongScreen() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const servicesQ = useQuery({
    queryKey: ["community-services"],
    queryFn: () => listCommunityServices(),
  });

  const eventsQ = useQuery({
    queryKey: ["community-events"],
    queryFn: () => listCommunityEvents(),
  });

  const regMut = useMutation({
    mutationFn: (eventId: string) => registerCommunityEvent({ event_id: eventId, family_id: familyId ?? undefined }),
    onSuccess: () => {
      toast.success("Đã đăng ký tham gia");
      qc.invalidateQueries({ queryKey: ["community-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Cộng đồng" back="/(tabs)/home" />

      <SectionHeader title="Dịch vụ cư dân" />
      {servicesQ.isLoading ? (
        <LoadingState />
      ) : (servicesQ.data?.length ?? 0) === 0 ? (
        <EmptyState title="Chưa có dịch vụ" />
      ) : (
        <View style={styles.grid}>
          {(servicesQ.data ?? []).map((s) => (
            <Card key={s.id} style={styles.service}>
              <Text style={styles.emoji}>{s.icon}</Text>
              {s.tag ? <Text style={styles.tag}>{s.tag}</Text> : null}
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.serviceDesc} numberOfLines={3}>{s.description}</Text>
            </Card>
          ))}
        </View>
      )}

      <SectionHeader title="Sự kiện tòa nhà" />
      {eventsQ.isLoading ? (
        <LoadingState />
      ) : (eventsQ.data?.length ?? 0) === 0 ? (
        <EmptyState title="Chưa có sự kiện sắp tới" />
      ) : (
        (eventsQ.data ?? []).map((e) => (
          <Card key={e.id} style={styles.event}>
            <Text style={styles.eventTitle}>{e.title}</Text>
            <Text style={styles.eventMeta}>
              {new Date(e.starts_at).toLocaleString("vi-VN")} · {e.place}
            </Text>
            <Pressable style={styles.regBtn} onPress={() => regMut.mutate(e.id)}>
              <Text style={styles.regText}>Đăng ký tham gia</Text>
            </Pressable>
          </Card>
        ))
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  service: { width: "47%", minHeight: 140 },
  emoji: { fontSize: 28 },
  tag: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    backgroundColor: colors.tintBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 8,
  },
  serviceName: { fontWeight: "700", color: colors.foreground, marginTop: 8 },
  serviceDesc: { fontSize: 11, color: colors.muted, marginTop: 4 },
  event: { marginBottom: 10, gap: 6 },
  eventTitle: { fontWeight: "700", fontSize: 16, color: colors.foreground },
  eventMeta: { fontSize: 12, color: colors.muted },
  regBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: colors.brandDeep,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
  regText: { color: colors.white, fontWeight: "700", fontSize: 13 },
});
