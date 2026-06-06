import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, QrCode } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  getHelperBundle,
  issueHelperShiftToken,
  listHelpers,
  setHelperAttendance,
  toggleHelperTask,
} from "@mobile/api/helpers";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";

function formatSalary(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "Chưa cập nhật";
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function GiupViecScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useGiupViecStyles();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const helpersQ = useQuery({
    queryKey: ["family-helpers", familyId],
    queryFn: () => listHelpers({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const helpers = helpersQ.data ?? [];
  const activeId = selectedId ?? helpers[0]?.id ?? null;

  const bundleQ = useQuery({
    queryKey: ["helper-bundle", activeId],
    queryFn: () => getHelperBundle({ helper_id: activeId! }),
    enabled: !!activeId,
  });

  const selected = useMemo(() => helpers.find((h) => h.id === activeId), [helpers, activeId]);
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = bundleQ.data?.attendance?.find((a) => a.att_date === today);
  const tasks = bundleQ.data?.tasks ?? [];

  const issueQr = useMutation({
    mutationFn: (kind: "check_in" | "check_out") => issueHelperShiftToken({ helper_id: activeId!, kind }),
    onSuccess: (res) => {
      setQrToken(res.token);
      toast.success("Đã tạo mã QR ca");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const taskToggle = useMutation({
    mutationFn: toggleHelperTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["helper-bundle"] }),
  });

  const markPresent = useMutation({
    mutationFn: () =>
      setHelperAttendance({
        helper_id: activeId!,
        att_date: today,
        status: "present",
      }),
    onSuccess: () => {
      toast.success("Đã điểm danh");
      qc.invalidateQueries({ queryKey: ["helper-bundle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Gia đình" title="Quản lý giúp việc" back="/(tabs)/gia-dinh" />

      <Pressable style={styles.addBtn} onPress={() => router.push("/quan-ly-giup-viec/them?type=helper")}>
        <Plus color={colors.white} size={18} />
        <Text style={styles.addText}>Thêm giúp việc</Text>
      </Pressable>

      {helpersQ.isLoading && <LoadingState />}
      {helpers.length === 0 && !helpersQ.isLoading && (
        <EmptyState title="Chưa có hồ sơ giúp việc" description="Thêm người giúp việc để quản lý ca và QR" />
      )}

      {helpers.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.chipRow}>
              {helpers.map((h) => (
                <Pressable
                  key={h.id}
                  onPress={() => {
                    setSelectedId(h.id);
                    setQrToken(null);
                  }}
                  style={[styles.chip, activeId === h.id && styles.chipActive]}
                >
                  <Text style={activeId === h.id ? styles.chipTextActive : styles.chipText}>
                    {h.avatar} {h.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {selected && (
            <Card style={styles.profileCard}>
              <Text style={styles.name}>{selected.name}</Text>
              <Text style={styles.sub}>
                {selected.role ?? "Giúp việc"} · {selected.phone ?? "—"}
              </Text>
              <Text style={styles.sub}>Lương: {formatSalary(selected.salary)}</Text>
              <Pressable onPress={() => router.push(`/quan-ly-giup-viec/them?type=helper&id=${selected.id}`)}>
                <Text style={styles.link}>Sửa hồ sơ</Text>
              </Pressable>
            </Card>
          )}

          <SectionHeader
            title="Việc hôm nay"
            onAction={() => router.push(`/quan-ly-giup-viec/them?type=task&helperId=${activeId}`)}
          />
          {tasks.length === 0 ? (
            <Text style={styles.emptyTasks}>Chưa có việc hôm nay. Nhấn + Thêm để tạo công việc.</Text>
          ) : (
            tasks.map((t) => (
              <Card key={t.id} style={styles.taskRow}>
                <Pressable onPress={() => taskToggle.mutate({ id: t.id, done: !t.done })} style={styles.check}>
                  {t.done ? <Check color={colors.success} size={16} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, t.done && styles.done]}>{t.title}</Text>
                  <Text style={styles.sub}>{t.time}</Text>
                </View>
              </Card>
            ))
          )}

          <SectionHeader title="Điểm danh" />
          <Card style={styles.attendanceCard}>
            <Text style={styles.sub}>
              Hôm nay:{" "}
              <Text style={styles.attStatus}>
                {todayAtt?.status === "present" ? "Có mặt" : todayAtt?.status ?? "Chưa chấm"}
              </Text>
            </Text>
            <PrimaryButton label="Điểm danh có mặt" onPress={() => markPresent.mutate()} loading={markPresent.isPending} />
          </Card>

          <SectionHeader title="QR ca làm" />
          <View style={styles.qrRow}>
            <Pressable style={styles.qrBtn} onPress={() => issueQr.mutate("check_in")}>
              <QrCode color={colors.brand} size={20} />
              <Text style={styles.qrBtnText}>Vào ca</Text>
            </Pressable>
            <Pressable style={styles.qrBtn} onPress={() => issueQr.mutate("check_out")}>
              <QrCode color={colors.warning} size={20} />
              <Text style={styles.qrBtnText}>Tan ca</Text>
            </Pressable>
          </View>
          {qrToken && (
            <Card style={styles.qrWrap}>
              <QRCode value={qrToken} size={180} backgroundColor={colors.card} color={colors.foreground} />
              <Text style={styles.token} selectable>
                {qrToken}
              </Text>
            </Card>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useGiupViecStyles() {
  return useThemedStyles((c, fontScale) => ({
    addBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      backgroundColor: c.brandDeep,
      padding: 14,
      borderRadius: radius.lg,
      marginBottom: 16,
    },
    addText: { color: c.white, fontWeight: "700" as const, fontSize: 15 * fontScale },
    chipRow: { flexDirection: "row" as const, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.brandDeep, borderColor: c.brandDeep },
    chipText: { fontWeight: "600" as const, color: c.foreground, fontSize: 13 * fontScale },
    chipTextActive: { fontWeight: "600" as const, color: c.white, fontSize: 13 * fontScale },
    profileCard: { marginBottom: 12, ...cardShadow(c) },
    name: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground },
    sub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },
    link: { color: c.brand, fontWeight: "700" as const, marginTop: 8, fontSize: 13 * fontScale },
    emptyTasks: { fontSize: 12 * fontScale, color: c.muted, marginBottom: 12, fontStyle: "italic" as const },
    taskRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 8 },
    check: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.mutedBg,
    },
    taskTitle: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    done: { textDecorationLine: "line-through" as const, color: c.muted },
    attendanceCard: { gap: 12, marginBottom: 8 },
    attStatus: { fontWeight: "700" as const, color: c.foreground },
    qrRow: { flexDirection: "row" as const, gap: 12, marginBottom: 16 },
    qrBtn: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      padding: 14,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    qrBtnText: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    qrWrap: { alignItems: "center" as const, gap: 12, padding: 16, marginBottom: 8 },
    token: { fontSize: 11 * fontScale, color: c.muted, textAlign: "center" as const },
  }));
}
