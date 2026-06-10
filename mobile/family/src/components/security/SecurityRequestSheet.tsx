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
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Paperclip, X } from "lucide-react-native";
import { attachSecurityRequestEvidence, createSecurityRequest } from "@mobile/api/security";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { securityMeta } from "@mobile/constants/security";
import { getSupabase } from "@shared/supabase/get-client";
import { FieldLabel, PrimaryButton, TextField } from "@mobile/components/ui";

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
  const [busy, setBusy] = useState(false);
  const { colors } = useTheme();
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
    fileName: { flex: 1, fontSize: 12 * fontScale, color: c.muted },
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
      toast.error("Cần quyền truy cập thư viện ảnh");
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
        toast.error(`${asset.fileName ?? "Ảnh"}: vượt 10MB`);
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

      if (files.length > 0 && res?.id) {
        const supabase = getSupabase();
        const uploaded: { path: string; name: string; size: number; mime: string }[] = [];
        for (const f of files) {
          const ext = f.name.split(".").pop() ?? "jpg";
          const path = `${res.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const blob = await fetch(f.uri).then((r) => r.blob());
          const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
            contentType: f.mime,
            upsert: false,
          });
          if (error) {
            toast.error(`${f.name}: ${error.message}`);
            continue;
          }
          uploaded.push({ path, name: f.name, size: f.size, mime: f.mime });
        }
        if (uploaded.length > 0) {
          try {
            await attachSecurityRequestEvidence({ id: res.id, files: uploaded });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Không ghi nhận được tệp đính kèm");
          }
        }
      }

      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(`Đã gửi: ${title}`, `Bảo an phản hồi trong ~${securityMeta.responseTimeMinutes} phút`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.sub}>
                  {hint ?? "Bổ sung vị trí & ghi chú để bảo an xử lý nhanh nhất."}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8} accessibilityLabel="Đóng">
                <X color={colors.muted} size={22} />
              </Pressable>
            </View>

            <View style={styles.row2}>
              <View style={styles.col}>
                <TextField
                  label="Toà / Block"
                  value={building}
                  onChangeText={setBuilding}
                  placeholder="VD: Block A"
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label="Căn hộ"
                  value={apartment}
                  onChangeText={setApartment}
                  placeholder="VD: A-1502"
                />
              </View>
            </View>

            <TextField
              label="Ghi chú"
              value={note}
              onChangeText={setNote}
              placeholder="Mô tả thêm (tuỳ chọn)…"
              multiline
            />

            <FieldLabel>Ảnh / chứng cứ (tuỳ chọn)</FieldLabel>
            <Pressable
              style={styles.attachBtn}
              onPress={() => void pickFiles()}
              disabled={busy || files.length >= 10}
            >
              <ImagePlus color={colors.foreground} size={18} />
              <Text style={styles.attachText}>Đính kèm ảnh ({files.length}/10)</Text>
            </Pressable>
            <Text style={styles.attachHint}>Tối đa 10MB/tệp · JPG/PNG/WEBP</Text>
            {files.map((f, i) => (
              <View key={`${f.uri}-${i}`} style={styles.fileRow}>
                <Paperclip color={colors.muted} size={14} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {f.name}
                </Text>
                <Pressable onPress={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                  <Text style={styles.fileRemove}>Xoá</Text>
                </Pressable>
              </View>
            ))}

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelBtn} disabled={busy}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </Pressable>
              <View style={styles.submitWrap}>
                <PrimaryButton
                  label="Gửi yêu cầu"
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
  );
}
