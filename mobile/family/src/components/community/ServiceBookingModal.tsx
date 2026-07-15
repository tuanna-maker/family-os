import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { TextField, PrimaryButton } from "@mobile/components/ui";
import { DateTimeField } from "@mobile/components/DateTimeField";
import { createServiceBooking } from "@mobile/api/community";
import { serviceDisplayIcon, type CommunityServiceItem } from "@mobile/utils/communityService";
import { toast } from "@mobile/utils/toast";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

type Props = {
  service: CommunityServiceItem | null;
  familyId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function ServiceBookingModal({ service, familyId, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const { s } = useI18n();
  const cm = s.community;
  const c = s.common;
  const styles = useModalStyles();
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!service) return;
    setPhone("");
    setWhen("");
    setNotes("");
  }, [service?.id]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!service || !familyId) throw new Error(c.noFamily);
      return createServiceBooking({
        service_id: service.id,
        family_id: familyId,
        contact_phone: phone.trim() || undefined,
        scheduled_at: when ? new Date(when).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(cm.bookingSent);
      onSuccess();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || c.requestFailed),
  });

  const visible = !!service;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerMain}>
                <Text style={styles.emoji}>{service ? serviceDisplayIcon(service) : "🛎️"}</Text>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{service?.name}</Text>
                  {service?.description ? (
                    <Text style={styles.subtitle}>{service.description}</Text>
                  ) : null}
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <X color={colors.muted} size={22} />
              </Pressable>
            </View>

            <TextField
              label={cm.bookingPhone}
              value={phone}
              onChangeText={setPhone}
              placeholder="VD: 0901 234 567"
              keyboardType="numeric"
            />
            <DateTimeField
              label={cm.bookingWhen}
              value={when}
              onChange={setWhen}
            />
            <TextField
              label={c.notes}
              value={notes}
              onChangeText={setNotes}
              placeholder="..."
              multiline
            />

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{c.cancel}</Text>
              </Pressable>
              <View style={styles.submitWrap}>
                <PrimaryButton
                  label={cm.bookingSubmit}
                  onPress={() => submit.mutate()}
                  loading={submit.isPending}
                  disabled={!familyId || submit.isPending}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useModalStyles() {
  return useThemedStyles((c, fontScale) => ({
    overlay: { flex: 1, justifyContent: "flex-end" as const },
    backdrop: {
      ...({ position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 }),
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
  }));
}
