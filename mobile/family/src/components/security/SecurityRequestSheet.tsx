import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Paperclip, X } from "lucide-react-native";
import { attachSecurityRequestEvidence, createSecurityRequest } from "@mobile/api/security";
import { readLocalFileBytes } from "@mobile/lib/upload-chat-media";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { securityMeta } from "@mobile/constants/security";
import { getSupabase } from "@shared/supabase/get-client";
import { FieldLabel, PrimaryButton, TextField } from "@mobile/components/ui";
import { useI18n } from "@mobile/i18n/useI18n";

const BUCKET = "security-attachments";
const MAX_FILE = 10 * 1024 * 1024;

type PickedFile = {
  uri: string;
  name: string;
  mime: string;
  size: number;
};

export function SecurityRequestSheet({
  visible,
  title,
  requestType,
  serviceGroup,
  serviceItem,
  hint,
  onClose,
}: {
  visible: boolean;
  title: string;
  requestType: string;
  serviceGroup?: string;
  serviceItem?: string;
  hint?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyContext();
  const [building, setBuilding] = useState("");
  const [apartment, setApartment] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { colors } = useTheme();
  const { s } = useI18n();
  const f = s.security.forms;
  const rs = f.requestSheet;
  const styles = useThemedStyles((c, fontScale) => ({
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
      paddingBottom: Math.max(insets.bottom, 20),
      maxHeight: "88%" as const,
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
    headerText: { flex: 1, minWidth: 0 },
    title: { fontSize: 18 * fontScale, fontWeight: "700" as const, color: c.foreground },
    sub: { fontSize: 13 * fontScale, color: c.muted, marginTop: 4, lineHeight: 18 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.mutedBg,
    },
    row2: { flexDirection: "row" as const, gap: 10 },
    col: { flex: 1 },
    attachBtn: {
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.cardBorder,
      borderRadius: radius.lg,
      paddingVertical: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      gap: 8,
      backgroundColor: c.mutedBg,
      marginBottom: 4,
    },
    attachText: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground },
    attachHint: { fontSize: 10 * fontScale, color: c.muted, marginTop: 4, marginBottom: 8 },
    fileRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      paddingVertical: 4,
    },
    fileName: { flex: 1, fontSize: 12 * fontScale, color: c.brand },
    fileRemove: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.emergency },
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

  useEffect(() => {
    if (!visible) return;
    setApartment(family?.apartment ?? "");
    setBuilding("");
    setNote("");
    setFiles([]);
  }, [visible, family?.apartment]);

  const pickFiles = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(rs.photoPermission);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (res.canceled) return;
    const next: PickedFile[] = [];
    for (const asset of res.assets) {
      if (files.length + next.length >= 10) break;
      const size = asset.fileSize ?? 0;
      if (size > MAX_FILE) {
        toast.error(rs.fileTooLarge(asset.fileName ?? "Photo"));
        continue;
      }
      next.push({
        uri: asset.uri,
        name: asset.fileName ?? `anh-${Date.now()}.jpg`,
        mime: asset.mimeType ?? "image/jpeg",
        size: size || 1,
      });
    }
    setFiles((prev) => [...prev, ...next].slice(0, 10));
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = (await createSecurityRequest({
        request_type: requestType,
        building: building.trim() || null,
        apartment: apartment.trim() || null,
        payload: {
          label: title,
          service_group: serviceGroup ?? null,
          service_item: serviceItem ?? null,
          note: note.trim() || null,
          submitted_at: new Date().toISOString(),
        },
      })) as { id: string };

      let attachWarning: string | null = null;

      if (files.length > 0 && res?.id) {
        const supabase = getSupabase();
        const uploaded: { path: string; name: string; size: number; mime: string }[] = [];
        let uploadError: string | null = null;
        for (const file of files) {
          try {
            const ext = file.name.split(".").pop() ?? "jpg";
            const path = `${res.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const bytes = await readLocalFileBytes(file.uri);
            const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
              contentType: file.mime,
              upsert: false,
            });
            if (error) {
              uploadError = `${file.name}: ${error.message}`;
              continue;
            }
            uploaded.push({ path, name: file.name, size: file.size, mime: file.mime });
          } catch (e) {
            uploadError = e instanceof Error ? e.message : rs.attachFailed;
          }
        }
        if (uploaded.length > 0) {
          try {
            await attachSecurityRequestEvidence({ id: res.id, files: uploaded });
          } catch (e) {
            uploadError = e instanceof Error ? e.message : rs.attachFailed;
          }
        }
        if (uploadError && uploaded.length === 0) {
          attachWarning = rs.sentWithoutAttach;
        } else if (uploadError) {
          attachWarning = rs.partialAttach(uploaded.length, files.length);
        }
      }

      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      void qc.invalidateQueries({ queryKey: ["security-status"] });
      toast.success(
        rs.sent(title),
        attachWarning ?? rs.sentSub(securityMeta.responseTimeMinutes),
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : f.sendFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={rs.close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.sub}>
                  {hint ?? rs.hint}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel={rs.close}>
                <X color={colors.muted} size={22} />
              </Pressable>
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <TextField
                  label={f.fields.building}
                  value={building}
                  onChangeText={setBuilding}
                  placeholder={f.placeholders.building}
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label={f.fields.unit}
                  value={apartment}
                  onChangeText={setApartment}
                  placeholder={f.placeholders.apartment}
                />
              </View>
            </View>

            <TextField
              label={f.fields.note}
              value={note}
              onChangeText={setNote}
              placeholder={f.placeholders.note}
              multiline
            />

            <FieldLabel>{f.fields.evidence}</FieldLabel>
            <Pressable
              style={styles.attachBtn}
              onPress={() => void pickFiles()}
              disabled={busy || files.length >= 10}
            >
              <ImagePlus color={colors.foreground} size={18} />
              <Text style={styles.attachText}>{rs.attach(files.length)}</Text>
            </Pressable>
            <Text style={styles.attachHint}>{rs.attachHint}</Text>
            {files.map((f, i) => (
              <View key={`${f.uri}-${i}`} style={styles.fileRow}>
                <Paperclip color={colors.muted} size={14} />
                <Pressable style={{ flex: 1 }} onPress={() => setPreviewUri(f.uri)}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {f.name}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                  <Text style={styles.fileRemove}>{rs.remove}</Text>
                </Pressable>
              </View>
            ))}

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelBtn} disabled={busy}>
                <Text style={styles.cancelText}>{rs.cancel}</Text>
              </Pressable>
              <View style={styles.submitWrap}>
                <PrimaryButton
                  label={rs.submit}
                  onPress={() => void submit()}
                  loading={busy}
                  disabled={busy}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" }}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
