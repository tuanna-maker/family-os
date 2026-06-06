import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listCommunityEvents,
  listCommunityServices,
  registerCommunityEvent,
  createServiceBooking,
} from "@mobile/api/community";
import {
  communityServiceRoute,
  serviceDisplayIcon,
  type CommunityServiceItem,
} from "@mobile/utils/communityService";
import { toast } from "@mobile/utils/toast";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function CongDongScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const styles = useThemedStyles((c, fontScale) => ({
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10, marginBottom: 24 },
    serviceWrap: { width: "47%" as const },
    service: { padding: 14, minHeight: 132 },
    serviceTop: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
    },
    emoji: { fontSize: 28 },
    tag: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: c.brand,
      backgroundColor: c.tintBlue,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      maxWidth: "55%",
    },
    serviceName: { fontWeight: "700" as const, color: c.foreground, marginTop: 10, fontSize: 14 * fontScale },
    serviceDesc: { fontSize: 11 * fontScale, color: c.muted, marginTop: 4, lineHeight: 15 },
    event: { marginBottom: 10, padding: 14 },
    eventRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    eventIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: c.tintPurple,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    eventEmoji: { fontSize: 24 },
    eventTitle: { fontWeight: "700" as const, fontSize: 14 * fontScale, color: c.foreground },
    eventMeta: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    regBtn: { paddingHorizontal: 4, paddingVertical: 6 },
    regText: { color: c.brand, fontWeight: "700" as const, fontSize: 12 * fontScale },
  }));

  const servicesQ = useQuery({
    queryKey: ["community-services"],
    queryFn: () => listCommunityServices(),
  });

  const eventsQ = useQuery({
    queryKey: ["community-events"],
    queryFn: () => listCommunityEvents(),
  });

  const bookMut = useMutation({
    mutationFn: (serviceId: string) =>
      createServiceBooking({ service_id: serviceId, family_id: familyId! }),
    onSuccess: () => toast.success("Đã đặt dịch vụ — BQL sẽ liên hệ"),
    onError: (e: Error) => toast.error(e.message),
  });

  const regMut = useMutation({
    mutationFn: (eventId: string) => registerCommunityEvent({ event_id: eventId, family_id: familyId ?? undefined }),
    onSuccess: () => {
      toast.success("Đã đăng ký tham gia");
      qc.invalidateQueries({ queryKey: ["community-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onServicePress = (s: CommunityServiceItem) => {
    const route = communityServiceRoute(s.slug);
    if (route) {
      router.push(route as never);
      return;
    }
    if (!familyId) {
      toast.error("Chưa có hộ gia đình");
      return;
    }
    Alert.alert(s.name, "Đặt dịch vụ này? Ban quản lý sẽ liên hệ xác nhận.", [
      { text: "Huỷ", style: "cancel" },
      { text: "Đặt ngay", onPress: () => bookMut.mutate(s.id) },
    ]);
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title="Cộng đồng"
        subtitle="Dịch vụ & sự kiện cho cư dân"
        showBack={false}
      />

      <SectionHeader title="Dịch vụ gia đình" />
      {servicesQ.isLoading ? (
        <LoadingState />
      ) : (servicesQ.data?.length ?? 0) === 0 ? (
        <EmptyState title="Chưa có dịch vụ" />
      ) : (
        <View style={styles.grid}>
          {(servicesQ.data ?? []).map((s) => (
            <Pressable
              key={s.id}
              style={styles.serviceWrap}
              onPress={() => onServicePress(s as CommunityServiceItem)}
            >
              <Card style={styles.service}>
                <View style={styles.serviceTop}>
                  <Text style={styles.emoji}>{serviceDisplayIcon(s as CommunityServiceItem)}</Text>
                  {s.tag ? (
                    <Text style={styles.tag} numberOfLines={1}>
                      {s.tag}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceDesc} numberOfLines={3}>
                  {s.description}
                </Text>
              </Card>
            </Pressable>
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
            <View style={styles.eventRow}>
              <View style={styles.eventIcon}>
                <Text style={styles.eventEmoji}>🎉</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={styles.eventMeta}>
                  {new Date(e.starts_at).toLocaleString("vi-VN")}
                </Text>
                <Text style={styles.eventMeta} numberOfLines={1}>
                  {e.place}
                </Text>
              </View>
              <Pressable
                style={styles.regBtn}
                onPress={() => regMut.mutate(e.id)}
                disabled={regMut.isPending}
              >
                <Text style={styles.regText}>Tham gia</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}
