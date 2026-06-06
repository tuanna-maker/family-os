import { useMemo } from "react";
import { Text, View } from "react-native";
import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { HealthRecordTiles } from "@mobile/components/health/HealthRecordTiles";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import type { HealthProfileRow } from "@mobile/api/health";

const BACK = "/suc-khoe/ho-so";

function profileDetails(p: HealthProfileRow) {
  const lines: string[] = [];
  if (p.blood_type) lines.push(`Nhóm máu ${p.blood_type}`);
  if (p.allergies?.trim()) lines.push(`⚠️ Dị ứng: ${p.allergies.trim()}`);
  if (p.conditions?.trim()) lines.push(`📋 Bệnh nền: ${p.conditions.trim()}`);
  if (p.dob) lines.push(`Ngày sinh: ${new Date(p.dob).toLocaleDateString("vi-VN")}`);
  if (lines.length === 0) lines.push("Chưa có thông tin chi tiết");
  return lines;
}

function openProfileEdit(
  openForm: ReturnType<typeof useHealthMutations>["openForm"],
  p: HealthProfileRow,
) {
  openForm({
    type: "profile",
    id: p.id,
    profileId: p.id,
    memberName: p.name,
    bloodType: p.blood_type ?? "",
    allergies: p.allergies ?? "",
    conditions: p.conditions ?? "",
  });
}

export default function HoSoSucKhoeScreen() {
  const styles = useHintStyles();
  const { isLoading, profiles, usingPilot, meds, appts, records, allergies, conditions } =
    useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  const recordCounts = useMemo(
    () => ({
      tests: records.length || (usingPilot ? 2 : 0),
      meds: meds.length,
      appts: appts.length,
      allergies: allergies.length,
      conditions: conditions.length,
    }),
    [records.length, usingPilot, meds.length, appts.length, allergies.length, conditions.length],
  );

  return (
    <HealthSubScreen
      title="Hồ sơ sức khỏe"
      subtitle="Hồ sơ từng thành viên trong gia đình"
      back="/suc-khoe"
      loading={isLoading && profiles.length === 0}
      actionLabel="Thêm hồ sơ"
      onAction={() => openForm({ type: "profile" })}
      emptyTitle="Chưa có hồ sơ"
      emptyDescription="Thêm hồ sơ sức khỏe cho từng thành viên."
      children={
        <View style={styles.categories}>
          <Text style={styles.sectionTitle}>Danh mục hồ sơ</Text>
          <HealthRecordTiles counts={recordCounts} />
        </View>
      }
      items={profiles.map((p) => ({
        id: p.id ?? p.name,
        emoji: avatarFor(p.name),
        title: p.name,
        details: profileDetails(p),
        onPress: () => openProfileEdit(openForm, p),
        onDelete: p.id && isPersistedHealthId(p.id)
          ? () => deleteRow({ table: "health_profiles", id: p.id })
          : undefined,
        deleteLabel: p.name,
      }))}
      footer={
        usingPilot ? (
          <Text style={styles.hint}>Dữ liệu mẫu — thêm hồ sơ thật bằng nút Thêm hồ sơ</Text>
        ) : null
      }
    />
  );
}

function useHintStyles() {
  return useThemedStyles((c, fontScale) => ({
    categories: { marginBottom: 16 },
    sectionTitle: { fontSize: 15 * fontScale, fontWeight: "800" as const, color: c.foreground, marginBottom: 10 },
    hint: {
      fontSize: 11 * fontScale,
      color: c.muted,
      textAlign: "center" as const,
      marginTop: 12,
      fontStyle: "italic" as const,
    },
  }));
}
