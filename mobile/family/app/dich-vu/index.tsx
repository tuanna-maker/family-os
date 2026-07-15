import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { ServiceBookingModal } from "@mobile/components/community/ServiceBookingModal";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createFamilyServiceRequest, listMyServiceRequests } from "@mobile/api/service-requests";
import { listCommunityServices } from "@mobile/api/community";
import { type CommunityServiceItem } from "@mobile/utils/communityService";
import { bookingStatusChip } from "@mobile/utils/serviceBookingStatus";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate } from "@mobile/i18n/format";
import { radius } from "@mobile/theme/colors";

function mapRequestStatus(status: string): string {
  if (status === "open") return "pending";
  if (status === "resolved") return "done";
  return status;
}

export default function DichVuScreen() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const styles = useDichVuStyles();
  const { locale, s } = useI18n();
  const sv = s.screens.services;
  const c = s.common;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [bookingService, setBookingService] = useState<CommunityServiceItem | null>(null);

  const ticketsQ = useQuery({
    queryKey: ["service-requests", familyId],
    queryFn: () => listMyServiceRequests({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const catalogQ = useQuery({
    queryKey: ["community-services"],
    queryFn: () => listCommunityServices(),
  });

  const ticketMut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: title.trim(),
        description: desc.trim() || undefined,
        category: "general",
      }),
    onSuccess: () => {
      setTitle("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["service-requests", familyId] });
      toast.success(c.requestSent);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={sv.title} back="/(tabs)/gia-dinh" />

      <SectionHeader title={sv.sendRequest} />
      <TextField label={sv.requestTitle} value={title} onChangeText={setTitle} placeholder={sv.requestPlaceholder} />
      <TextField label={sv.requestDesc} value={desc} onChangeText={setDesc} multiline />
      <PrimaryButton
        label={sv.sendRequest}
        onPress={() => ticketMut.mutate()}
        disabled={!title.trim()}
        loading={ticketMut.isPending}
      />

      <SectionHeader title={sv.catalog} />
      {catalogQ.isLoading && <LoadingState />}
      <View style={styles.grid}>
        {(catalogQ.data ?? []).map((svc) => (
          <Pressable
            key={svc.id}
            style={styles.serviceCard}
            onPress={() => {
              if (!familyId) {
                toast.error(c.noFamily);
                return;
              }
              setBookingService(svc as CommunityServiceItem);
            }}
          >
            <Text style={styles.emoji}>{svc.icon ?? "🛎️"}</Text>
            <Text style={styles.serviceName} numberOfLines={2}>
              {svc.name}
            </Text>
            <Text style={styles.book}>{sv.book}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title={sv.myRequests} />
      {ticketsQ.isLoading && <LoadingState />}
      {(ticketsQ.data ?? []).length === 0 && !ticketsQ.isLoading && (
        <EmptyState title={sv.empty} />
      )}
      {(ticketsQ.data ?? []).map((t) => {
        const chip = bookingStatusChip(mapRequestStatus(t.status), colors, locale);
        return (
          <Card key={t.id} style={{ marginBottom: 8 }}>
            <View style={styles.ticketRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.ticketTitle}>{t.title}</Text>
                <Text style={styles.ticketMeta}>{formatDate(t.created_at, locale)}</Text>
              </View>
              <Text style={[styles.statusChip, { color: chip.color, backgroundColor: chip.bg }]}>
                {chip.label}
              </Text>
            </View>
          </Card>
        );
      })}
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

function useDichVuStyles() {
  return useThemedStyles((c) => ({
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10, marginBottom: 16 },
    serviceCard: {
      width: "47%" as const,
      padding: 12,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    emoji: { fontSize: 28 },
    serviceName: { fontWeight: "700" as const, marginTop: 6, color: c.foreground },
    book: { fontSize: 11, color: c.brand, marginTop: 4, fontWeight: "700" as const },
    ticketRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    ticketTitle: { fontWeight: "700" as const, color: c.foreground },
    ticketMeta: { fontSize: 11, color: c.muted, marginTop: 4 },
    statusChip: {
      fontSize: 10,
      fontWeight: "700" as const,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
      overflow: "hidden" as const,
    },
  }));
}
