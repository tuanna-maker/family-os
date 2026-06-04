import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  MessageSquare,
  Package,
  Phone,
  ShieldCheck,
  UserX,
  Volume2,
  Wrench,
} from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState } from "@mobile/components/states";
import { colors, radius } from "@mobile/theme/colors";
import { createSecurityRequest, listSecurityRequests } from "@mobile/api/security";
import { toast } from "@mobile/utils/toast";

const HOTLINE = "19001234";

const GRID = [
  { id: "fire", label: "Báo cháy", icon: Flame, type: "fire", color: colors.warning },
  { id: "noise", label: "Tiếng ồn", icon: Volume2, type: "noise", color: colors.brand },
  { id: "package", label: "Nhận hàng", icon: Package, type: "package", color: colors.brand },
  { id: "stranger", label: "Người lạ", icon: UserX, type: "intrusion", color: colors.pink },
  { id: "tech", label: "Kỹ thuật", icon: Wrench, type: "other", color: colors.brand },
];

export default function BaoAnScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const requestsQ = useQuery({
    queryKey: ["security-requests"],
    queryFn: () => listSecurityRequests(),
  });

  const trigger = async (type: string, label: string) => {
    setPending(type);
    try {
      await createSecurityRequest({ request_type: type });
      await qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(`Đã gửi: ${label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi gửi yêu cầu");
    } finally {
      setPending(null);
    }
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Bảo an gia đình" />

      <Pressable
        style={styles.sos}
        onPress={() => trigger("sos", "SOS khẩn cấp")}
        disabled={pending === "sos"}
      >
        <Text style={styles.sosEmoji}>🆘</Text>
        <View>
          <Text style={styles.sosTitle}>{pending === "sos" ? "Đang gửi…" : "Gọi SOS khẩn cấp"}</Text>
          <Text style={styles.sosSub}>Nhấn để kích hoạt ngay</Text>
        </View>
      </Pressable>

      <View style={styles.ctaRow}>
        <Pressable style={styles.cta} onPress={() => Linking.openURL(`tel:${HOTLINE}`)}>
          <Phone color={colors.white} size={20} />
          <Text style={styles.ctaText}>Gọi {HOTLINE}</Text>
        </Pressable>
        <Pressable style={[styles.cta, styles.ctaOutline]} onPress={() => router.push("/bao-an/chat")}>
          <MessageSquare color={colors.brand} size={20} />
          <Text style={[styles.ctaText, { color: colors.brand }]}>Chat bảo an</Text>
        </Pressable>
      </View>

      <SectionHeader title="Dịch vụ bảo an" />
      <View style={styles.grid}>
        {GRID.map((g) => {
          const Icon = g.icon;
          return (
            <Pressable
              key={g.id}
              style={styles.gridItem}
              onPress={() => trigger(g.type, g.label)}
              disabled={pending === g.type}
            >
              <View style={[styles.gridIcon, { backgroundColor: colors.tintBlue }]}>
                <Icon color={g.color} size={22} />
              </View>
              <Text style={styles.gridLabel}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Yêu cầu gần đây" />
      {requestsQ.isLoading && <LoadingState />}
      {(requestsQ.data ?? []).slice(0, 8).map((r) => (
        <Card key={r.id} style={styles.reqRow}>
          <ShieldCheck color={colors.brand} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reqType}>{r.request_type.toUpperCase()}</Text>
            <Text style={styles.reqMeta}>{r.status} · {new Date(r.created_at).toLocaleString("vi-VN")}</Text>
          </View>
        </Card>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.emergency,
    padding: 20,
    borderRadius: radius.xl,
    marginBottom: 12,
  },
  sosEmoji: { fontSize: 36 },
  sosTitle: { fontSize: 20, fontWeight: "800", color: colors.white },
  sosSub: { fontSize: 13, color: "#FFFFFFCC", marginTop: 2 },
  ctaRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  cta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brandDeep,
    padding: 14,
    borderRadius: radius.lg,
  },
  ctaOutline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  ctaText: { fontWeight: "700", color: colors.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  gridItem: { width: "47%", alignItems: "center", gap: 8 },
  gridIcon: { width: "100%", height: 64, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  gridLabel: { fontWeight: "600", color: colors.foreground, fontSize: 13 },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reqType: { fontWeight: "700", color: colors.foreground },
  reqMeta: { fontSize: 11, color: colors.muted },
});
