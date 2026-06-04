import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { Plus, ScanLine, Ban } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  createVisitorPass,
  listVisitorPasses,
  revokeVisitorPass,
} from "@mobile/api/visitor-passes";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

export default function QrVaoRaScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hours, setHours] = useState("24");
  const [newPass, setNewPass] = useState<{ pass_code: string; guest_name: string } | null>(null);

  const q = useQuery({
    queryKey: ["visitor-passes", familyId],
    queryFn: () => listVisitorPasses({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createVisitorPass({
        family_id: familyId!,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim() || undefined,
        purpose: purpose.trim() || undefined,
        valid_hours: Number(hours) || 24,
      }),
    onSuccess: (res) => {
      setNewPass({ pass_code: res.pass_code, guest_name: res.guest_name });
      setGuestName("");
      setGuestPhone("");
      setPurpose("");
      qc.invalidateQueries({ queryKey: ["visitor-passes", familyId] });
      toast.success("Đã tạo mã khách");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: revokeVisitorPass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitor-passes", familyId] });
      toast.success("Đã thu hồi mã");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="QR ra vào khách" back="/(tabs)/gia-dinh" />

      <Pressable
        style={styles.scanLink}
        onPress={() => router.push({ pathname: "/quet-ma", params: { type: "visitor" } })}
      >
        <ScanLine color={colors.brand} size={20} />
        <Text style={styles.scanText}>Quét mã khách tại cổng</Text>
      </Pressable>

      <SectionHeader title="Tạo mã mới" />
      <TextField label="Tên khách" value={guestName} onChangeText={setGuestName} />
      <TextField label="SĐT (tuỳ chọn)" value={guestPhone} onChangeText={setGuestPhone} />
      <TextField label="Mục đích" value={purpose} onChangeText={setPurpose} />
      <TextField label="Hiệu lực (giờ)" value={hours} onChangeText={setHours} keyboardType="numeric" />
      <PrimaryButton
        label="Tạo QR khách"
        onPress={() => createMut.mutate()}
        disabled={!guestName.trim() || createMut.isPending}
        loading={createMut.isPending}
      />

      {newPass && (
        <Card style={{ alignItems: "center", marginTop: 16, gap: 12 }}>
          <Text style={styles.passTitle}>{newPass.guest_name}</Text>
          <QRCode value={newPass.pass_code} size={160} />
          <Text selectable style={styles.code}>{newPass.pass_code}</Text>
          <Pressable onPress={() => Share.share({ message: `Mã vào: ${newPass.pass_code}` })}>
            <Text style={styles.share}>Chia sẻ mã</Text>
          </Pressable>
        </Card>
      )}

      <SectionHeader title="Mã đã tạo" />
      {q.isLoading && <LoadingState />}
      {(q.data ?? []).length === 0 && !q.isLoading && <EmptyState title="Chưa có mã khách" />}
      {(q.data ?? []).map((p) => (
        <Card key={p.id} style={styles.passRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.passName}>{p.guest_name}</Text>
            <Text style={styles.passMeta}>
              {p.pass_code} · {p.status} · đến {new Date(p.valid_until).toLocaleString("vi-VN")}
            </Text>
          </View>
          {p.status === "active" && (
            <Pressable
              onPress={() =>
                Alert.alert("Thu hồi mã?", p.guest_name, [
                  { text: "Huỷ", style: "cancel" },
                  { text: "Thu hồi", style: "destructive", onPress: () => revokeMut.mutate({ id: p.id }) },
                ])
              }
            >
              <Ban color={colors.emergency} size={18} />
            </Pressable>
          )}
        </Card>
      ))}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.tintBlue,
    padding: 12,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  scanText: { fontWeight: "700", color: colors.brand },
  passTitle: { fontWeight: "800", fontSize: 16 },
  code: { fontSize: 12, color: colors.muted },
  share: { color: colors.brand, fontWeight: "700" },
  passRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  passName: { fontWeight: "700", color: colors.foreground },
  passMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
