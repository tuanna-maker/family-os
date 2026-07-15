import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { ScanLine, Ban } from "lucide-react-native";
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
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDateTime } from "@mobile/i18n/format";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

export default function QrVaoRaScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { locale, s } = useI18n();
  const qr = s.screens.qr;
  const c = s.common;
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
      toast.success(c.guestQrCreated);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: revokeVisitorPass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitor-passes", familyId] });
      toast.success(c.qrRevoked);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={qr.title} back="/(tabs)/gia-dinh" />

      <Pressable
        style={styles.scanLink}
        onPress={() => router.push({ pathname: "/quet-ma", params: { type: "visitor" } })}
      >
        <ScanLine color={colors.brand} size={20} />
        <Text style={styles.scanText}>{qr.scanAtGate}</Text>
      </Pressable>

      <SectionHeader title={qr.create} />
      <TextField label={c.guestName} value={guestName} onChangeText={setGuestName} />
      <TextField label={c.guestPhone} value={guestPhone} onChangeText={setGuestPhone} />
      <TextField label={c.purpose} value={purpose} onChangeText={setPurpose} />
      <TextField label={c.validityHours} value={hours} onChangeText={setHours} keyboardType="numeric" />
      <PrimaryButton
        label={c.createGuestQr}
        onPress={() => createMut.mutate()}
        disabled={!guestName.trim() || createMut.isPending}
        loading={createMut.isPending}
      />

      {newPass && (
        <Card style={{ alignItems: "center", marginTop: 16, gap: 12 }}>
          <Text style={styles.passTitle}>{newPass.guest_name}</Text>
          <QRCode value={newPass.pass_code} size={160} />
          <Text selectable style={styles.code}>{newPass.pass_code}</Text>
          <Pressable onPress={() => Share.share({ message: qr.shareMessage(newPass.pass_code) })}>
            <Text style={styles.share}>{qr.shareCode}</Text>
          </Pressable>
        </Card>
      )}

      <SectionHeader title={qr.created} />
      {q.isLoading && <LoadingState />}
      {(q.data ?? []).length === 0 && !q.isLoading && <EmptyState title={c.noGuestCodes} />}
      {(q.data ?? []).map((p) => (
        <Card key={p.id} style={styles.passRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.passName}>{p.guest_name}</Text>
            <Text style={styles.passMeta}>
              {p.pass_code} · {p.status} · {qr.validUntil(formatDateTime(p.valid_until, locale))}
            </Text>
          </View>
          {p.status === "active" && (
            <Pressable
              onPress={() =>
                appAlert(c.revokeConfirm(p.guest_name), p.guest_name, [
                  { text: c.cancel, style: "cancel" },
                  { text: c.revoke, style: "destructive", onPress: () => revokeMut.mutate({ id: p.id }) },
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
