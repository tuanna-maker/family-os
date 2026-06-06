import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@mobile/components/ui";
import type { MedicineReminderRow } from "@mobile/api/elderly-care";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export function MedicineConfirmModal({
  med,
  time,
  note,
  onTimeChange,
  onNoteChange,
  onCancel,
  onConfirm,
  pending,
}: {
  med: MedicineReminderRow | null;
  time: string;
  note: string;
  onTimeChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center" as const,
      padding: 24,
    },
    sheet: {
      backgroundColor: c.card,
      borderRadius: radius.xl,
      padding: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    title: { fontSize: 17 * fontScale, fontWeight: "800" as const, color: c.foreground },
    sub: { fontSize: 13 * fontScale, color: c.muted, marginTop: 6, marginBottom: 16 },
    label: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.muted, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15 * fontScale,
      color: c.foreground,
      marginBottom: 12,
    },
    cancel: { marginTop: 10, alignItems: "center" as const, paddingVertical: 8 },
    cancelText: { color: c.muted, fontWeight: "600" as const },
  }));

  return (
    <Modal visible={!!med} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Xác nhận đã uống thuốc</Text>
          <Text style={styles.sub}>
            {med?.medicine}
            {med?.dosage ? ` · ${med.dosage}` : ""}
          </Text>
          <Text style={styles.label}>Giờ uống (HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={onTimeChange}
            placeholder="08:00"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Ghi chú (tuỳ chọn)</Text>
          <TextInput
            style={[styles.input, { minHeight: 56, textAlignVertical: "top" }]}
            value={note}
            onChangeText={onNoteChange}
            placeholder="vd: uống sau bữa sáng"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={200}
          />
          <PrimaryButton label="Xác nhận" onPress={onConfirm} loading={pending} disabled={pending} />
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Huỷ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
