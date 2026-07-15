import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { PrimaryButton, TextField } from "@mobile/components/ui";
import type { ExpenseCategoryDef } from "@mobile/lib/expense-settings";
import { slugifyCategoryKey } from "@mobile/lib/expense-category-key";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

type Props = {
  visible: boolean;
  editing: ExpenseCategoryDef | null;
  onClose: () => void;
  onSave: (row: ExpenseCategoryDef) => void;
  loading?: boolean;
};

export function CategoryFormModal({ visible, editing, onClose, onSave, loading }: Props) {
  const { colors } = useTheme();
  const { s } = useI18n();
  const cs = s.expense.categorySettings;
  const c = s.common;
  const styles = useStyles();
  const [form, setForm] = useState({ key: "", labelVi: "", labelEn: "", icon: "📁", color: "#6366F1" });

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        key: editing.key,
        labelVi: editing.labelVi,
        labelEn: editing.labelEn,
        icon: editing.icon,
        color: editing.color,
      });
    } else {
      setForm({ key: "", labelVi: "", labelEn: "", icon: "📁", color: "#6366F1" });
    }
  }, [visible, editing?.key]);

  const previewKey = editing?.key
    ? form.key
    : slugifyCategoryKey(form.labelVi, form.labelEn);

  const submit = () => {
    if (!form.labelVi.trim()) return;
    const key = editing?.key ?? slugifyCategoryKey(form.labelVi, form.labelEn);
    onSave({
      key,
      labelVi: form.labelVi.trim(),
      labelEn: form.labelEn.trim() || form.labelVi.trim(),
      icon: form.icon.trim() || "📁",
      color: form.color,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerMain}>
                <Text style={styles.emoji}>{form.icon || "📁"}</Text>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{editing?.key ? cs.editTitle : cs.add}</Text>
                  <Text style={styles.subtitle}>{cs.formHint}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <X color={colors.muted} size={22} />
              </Pressable>
            </View>

            <TextField
              label={cs.nameVi}
              value={form.labelVi}
              onChangeText={(t) => setForm((p) => ({ ...p, labelVi: t }))}
            />
            <TextField
              label={cs.nameEn}
              value={form.labelEn}
              onChangeText={(t) => setForm((p) => ({ ...p, labelEn: t }))}
            />
            <TextField
              label={cs.icon}
              value={form.icon}
              onChangeText={(t) => setForm((p) => ({ ...p, icon: t }))}
            />
            <View style={styles.readonlyBlock}>
              <Text style={styles.readonlyLabel}>{cs.key}</Text>
              <Text style={styles.readonlyValue}>{previewKey || "—"}</Text>
              {!editing?.key ? <Text style={styles.readonlyHint}>{cs.keyHint}</Text> : null}
            </View>

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{c.cancel}</Text>
              </Pressable>
              <View style={styles.submitWrap}>
                <PrimaryButton
                  label={cs.save}
                  onPress={submit}
                  loading={loading}
                  disabled={!form.labelVi.trim() || loading}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    overlay: { flex: 1, justifyContent: "flex-end" as const },
    backdrop: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 20,
      paddingBottom: 28,
      maxHeight: "88%",
    },
    handle: {
      alignSelf: "center" as const,
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.mutedBg,
      marginTop: 10,
      marginBottom: 12,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      marginBottom: 8,
      gap: 8,
    },
    headerMain: { flex: 1, flexDirection: "row" as const, gap: 12 },
    headerText: { flex: 1, minWidth: 0 },
    emoji: { fontSize: 32 },
    title: { fontSize: 18 * fontScale, fontWeight: "700" as const, color: c.foreground },
    subtitle: { fontSize: 13 * fontScale, color: c.muted, marginTop: 4, lineHeight: 18 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.mutedBg,
    },
    actions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      marginTop: 4,
      marginBottom: 8,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      minHeight: 48,
      justifyContent: "center" as const,
    },
    cancelText: { fontSize: 15 * fontScale, fontWeight: "600" as const, color: c.foreground },
    submitWrap: { flex: 1 },
    readonlyBlock: { marginBottom: 12 },
    readonlyLabel: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.muted, marginBottom: 6 },
    readonlyValue: {
      fontSize: 14 * fontScale,
      color: c.foreground,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: radius.lg,
      backgroundColor: c.mutedBg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: "hidden" as const,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    readonlyHint: { fontSize: 11 * fontScale, color: c.muted, marginTop: 6, lineHeight: 16 },
  }));
}
