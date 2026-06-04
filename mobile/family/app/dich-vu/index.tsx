import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createFamilyServiceRequest, listMyServiceRequests } from "@mobile/api/service-requests";
import { listCommunityServices, createServiceBooking } from "@mobile/api/community";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";
import { Pressable } from "react-native";

export default function DichVuScreen() {
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

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
      toast.success("Đã gửi yêu cầu");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bookMut = useMutation({
    mutationFn: (serviceId: string) => createServiceBooking({ service_id: serviceId, family_id: familyId! }),
    onSuccess: () => toast.success("Đã đặt dịch vụ — BQL sẽ liên hệ"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Dịch vụ & Tiện ích" back="/(tabs)/gia-dinh" />

      <SectionHeader title="Gửi yêu cầu" />
      <TextField label="Tiêu đề" value={title} onChangeText={setTitle} placeholder="Hỗ trợ kỹ thuật tại nhà" />
      <TextField label="Mô tả" value={desc} onChangeText={setDesc} multiline />
      <PrimaryButton
        label="Gửi yêu cầu"
        onPress={() => ticketMut.mutate()}
        disabled={!title.trim()}
        loading={ticketMut.isPending}
      />

      <SectionHeader title="Danh mục dịch vụ" />
      {catalogQ.isLoading && <LoadingState />}
      <View style={styles.grid}>
        {(catalogQ.data ?? []).map((s: { id: string; name: string; icon?: string; slug?: string }) => (
          <Pressable key={s.id} style={styles.serviceCard} onPress={() => bookMut.mutate(s.id)}>
            <Text style={styles.emoji}>{s.icon ?? "🛎️"}</Text>
            <Text style={styles.serviceName} numberOfLines={2}>
              {s.name}
            </Text>
            <Text style={styles.book}>Đặt →</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Yêu cầu của tôi" />
      {ticketsQ.isLoading && <LoadingState />}
      {(ticketsQ.data ?? []).length === 0 && !ticketsQ.isLoading && (
        <EmptyState title="Chưa có yêu cầu" />
      )}
      {(ticketsQ.data ?? []).map((t) => (
        <Card key={t.id} style={{ marginBottom: 8 }}>
          <Text style={styles.ticketTitle}>{t.title}</Text>
          <Text style={styles.ticketMeta}>
            {t.status} · {new Date(t.created_at).toLocaleDateString("vi-VN")}
          </Text>
        </Card>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  serviceCard: {
    width: "47%",
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emoji: { fontSize: 28 },
  serviceName: { fontWeight: "700", marginTop: 6, color: colors.foreground },
  book: { fontSize: 11, color: colors.brand, marginTop: 4, fontWeight: "700" },
  ticketTitle: { fontWeight: "700", color: colors.foreground },
  ticketMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
