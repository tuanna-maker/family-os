import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { ServiceBookingModal } from "@mobile/components/community/ServiceBookingModal";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  cancelServiceBooking,
  listCommunityEvents,
  listCommunityServices,
  listMyServiceBookings,
  registerCommunityEvent,
} from "@mobile/api/community";
import {
  localizeCommunityService,
  localizeServiceName,
  serviceDisplayIcon,
  type CommunityServiceItem,
} from "@mobile/utils/communityService";
import { bookingStatusChip } from "@mobile/utils/serviceBookingStatus";
import { toast } from "@mobile/utils/toast";
import { localeTag } from "@mobile/i18n/format";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function CongDongScreen() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const cm = s.community;
  const c = s.common;
  const styles = useCongDongStyles();
  const [bookingService, setBookingService] = useState<CommunityServiceItem | null>(null);

  const servicesQ = useQuery({
    queryKey: ["community-services"],
    queryFn: () => listCommunityServices(),
  });

  const bookingsQ = useQuery({
    queryKey: ["service-bookings"],
    queryFn: () => listMyServiceBookings(),
  });

  const eventsQ = useQuery({
    queryKey: ["community-events"],
    queryFn: () => listCommunityEvents(),
  });

  const regMut = useMutation({
    mutationFn: (eventId: string) =>
      registerCommunityEvent({ event_id: eventId, family_id: familyId ?? undefined }),
    onSuccess: () => {
      toast.success(c.registered);
      qc.invalidateQueries({ queryKey: ["community-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelServiceBooking({ id }),
    onSuccess: () => {
      toast.success(c.cancelled);
      qc.invalidateQueries({ queryKey: ["service-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onServicePress = (s: CommunityServiceItem) => {
    if (!familyId) {
      toast.error(c.noFamily);
      return;
    }
    setBookingService(s);
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={cm.title}
        subtitle={cm.subtitle}
        showBack={false}
      />

      <SectionHeader title={cm.pickService} />
      {servicesQ.isLoading ? (
        <LoadingState />
      ) : (servicesQ.data?.length ?? 0) === 0 ? (
        <EmptyState title={c.noServices} />
      ) : (
        <View style={styles.grid}>
          {(servicesQ.data ?? []).map((raw) => {
            const s = localizeCommunityService(raw as CommunityServiceItem, locale);
            return (
              <Pressable
                key={s.id}
                style={styles.serviceWrap}
                onPress={() => onServicePress(s)}
              >
                <Card style={styles.service}>
                  <View style={styles.serviceTop}>
                    <Text style={styles.emoji}>{serviceDisplayIcon(s)}</Text>
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
            );
          })}
        </View>
      )}

      <SectionHeader title={cm.recentRequests} />
      {bookingsQ.isLoading ? (
        <LoadingState />
      ) : (bookingsQ.data?.length ?? 0) === 0 ? (
        <Card style={styles.emptyBookings}>
          <Text style={styles.emptyBookingsText}>{c.noBookings}</Text>
        </Card>
      ) : (
        (bookingsQ.data ?? []).map((b) => {
          const canCancel = b.status === "pending" || b.status === "confirmed";
          const chip = bookingStatusChip(b.status, colors, locale);
          return (
            <Card key={b.id} style={styles.booking}>
              <View style={styles.bookingRow}>
                <View style={styles.bookingIcon}>
                  <Text style={styles.bookingEmoji}>
                    {b.community_services?.icon ?? "🛎️"}
                  </Text>
                </View>
                <View style={styles.bookingBody}>
                  <Text style={styles.bookingName} numberOfLines={1}>
                    {localizeServiceName(
                      b.community_services?.slug,
                      b.community_services?.name,
                      locale,
                    ) || cm.bookingDefaultService}
                  </Text>
                  <Text style={styles.bookingMeta} numberOfLines={1}>
                    {b.scheduled_at
                      ? new Date(b.scheduled_at).toLocaleString(localeTag(locale))
                      : new Date(b.created_at).toLocaleString(localeTag(locale))}
                  </Text>
                </View>
                <Text style={[styles.bookingStatus, { color: chip.color, backgroundColor: chip.bg }]}>
                  {chip.label}
                </Text>
                {canCancel ? (
                  <Pressable
                    onPress={() => cancelMut.mutate(b.id)}
                    style={styles.cancelIcon}
                    hitSlop={8}
                    disabled={cancelMut.isPending}
                  >
                    <X color={colors.muted} size={18} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      <SectionHeader title={cm.buildingEvents} />
      {eventsQ.isLoading ? (
        <LoadingState />
      ) : (eventsQ.data?.length ?? 0) === 0 ? (
        <EmptyState title={c.noEvents} />
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
                  {new Date(e.starts_at).toLocaleString(localeTag(locale))}
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
                <Text style={styles.regText}>{c.join}</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <ServiceBookingModal
        service={bookingService}
        familyId={familyId}
        onClose={() => setBookingService(null)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["service-bookings"] })}
      />

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useCongDongStyles() {
  return useThemedStyles((c, fontScale) => ({
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
    emptyBookings: { padding: 16, marginBottom: 12, alignItems: "center" as const },
    emptyBookingsText: { fontSize: 12 * fontScale, color: c.muted, textAlign: "center" as const },
    booking: { marginBottom: 8, padding: 12 },
    bookingRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    bookingIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    bookingEmoji: { fontSize: 20 },
    bookingBody: { flex: 1, minWidth: 0 },
    bookingName: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    bookingMeta: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    bookingStatus: {
      fontSize: 10,
      fontWeight: "700" as const,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: "hidden" as const,
    },
    cancelIcon: { padding: 4 },
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
}
