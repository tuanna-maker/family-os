import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ImageIcon, RotateCcw } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateField } from "@mobile/components/DateTimeField";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { scanReceipt, type ScanResult } from "@mobile/api/scan-receipt";
import { createExpense } from "@mobile/api/expenses";
import { uriToDataUrl } from "@mobile/lib/image-data-url";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

type Phase = "capture" | "scanning" | "review" | "saved" | "error";

const CATEGORIES = ["Ăn uống", "Nhà cửa", "Con cái", "Sức khỏe", "Giải trí", "Khác"] as const;

function formatVnd(n: number) {
  return `${(n ?? 0).toLocaleString("vi-VN")}đ`;
}

export default function ChiTieuScanScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const pickImage = async (useCamera: boolean) => {
    if (!familyId) {
      setError("Chưa có gia đình");
      setPhase("error");
      return;
    }
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(useCamera ? "Cần quyền camera" : "Cần quyền thư viện ảnh");
      return;
    }
    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsMultipleSelection: false,
        });
    if (picked.canceled || !picked.assets[0]) return;

    const uri = picked.assets[0].uri;
    setPreview(uri);
    setPhase("scanning");
    setError("");

    try {
      const dataUrl = await uriToDataUrl(uri);
      if (dataUrl.length > 8_000_000) {
        setError("Ảnh quá lớn (>6MB).");
        setPhase("error");
        return;
      }
      const res = await scanReceipt({ family_id: familyId, imageDataUrl: dataUrl });
      if (!res.ok) {
        setError(res.error);
        setPhase("error");
        return;
      }
      setResult(res.result);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không quét được");
      setPhase("error");
    }
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError("");
    setPhase("capture");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!result || !familyId) throw new Error("Thiếu dữ liệu");
      await createExpense({
        family_id: familyId,
        title: result.merchant,
        category: result.category,
        amount: result.total,
        spent_on: result.date,
        scan_id: result.scan_id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      setPhase("saved");
      toast.success("Đã lưu khoản chi");
      setTimeout(() => router.replace("/chi-tieu"), 900);
    },
    onError: (e: Error) => {
      setError(e.message);
      setPhase("error");
    },
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Chi tiêu" title="Quét hoá đơn" back="/chi-tieu" />

      {phase === "capture" && (
        <View>
          <Card style={styles.hero}>
            <Text style={styles.heroEmoji}>📸</Text>
            <Text style={styles.heroTitle}>Chụp hoặc tải hoá đơn lên</Text>
            <Text style={styles.heroSub}>AI đọc cửa hàng, số tiền và phân loại</Text>
          </Card>
          <PrimaryButton label="Chụp hoá đơn" onPress={() => pickImage(true)} />
          <View style={{ height: 10 }} />
          <Pressable style={styles.secondaryBtn} onPress={() => pickImage(false)}>
            <ImageIcon color={colors.foreground} size={20} />
            <Text style={styles.secondaryText}>Chọn từ thư viện</Text>
          </Pressable>
        </View>
      )}

      {phase === "scanning" && preview && (
        <View style={styles.scanWrap}>
          <Image source={{ uri: preview }} style={styles.preview} />
          <View style={styles.scanOverlay}>
            <ActivityIndicator color={colors.brand} size="large" />
            <Text style={styles.scanText}>AI đang đọc hoá đơn…</Text>
            <Text style={styles.scanSub}>Khoảng 3–8 giây</Text>
          </View>
        </View>
      )}

      {phase === "review" && result && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {preview && <Image source={{ uri: preview }} style={styles.previewSmall} />}
          <Card style={{ marginTop: 12, gap: 4 }}>
            <TextField
              label="Cửa hàng"
              value={result.merchant}
              onChangeText={(v) => setResult({ ...result, merchant: v })}
            />
            <TextField
              label="Số tiền"
              value={String(result.total)}
              onChangeText={(v) => setResult({ ...result, total: Number(v) || 0 })}
              keyboardType="numeric"
            />
            <DateField
              label="Ngày"
              value={result.date}
              onChange={(v) => setResult({ ...result, date: v })}
            />
            <FieldLabel>Danh mục</FieldLabel>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <SelectChip
                  key={c}
                  label={c}
                  active={result.category === c}
                  onPress={() => setResult({ ...result, category: c })}
                />
              ))}
            </View>
          </Card>
          <Card style={{ marginTop: 12, backgroundColor: colors.tintGreen }}>
            <Text style={styles.totalLabel}>Tổng sẽ ghi nhận</Text>
            <Text style={styles.totalAmount}>{formatVnd(result.total)}</Text>
          </Card>
          <View style={styles.rowBtns}>
            <Pressable style={styles.secondaryBtn} onPress={reset}>
              <RotateCcw color={colors.foreground} size={18} />
              <Text style={styles.secondaryText}>Quét lại</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Lưu khoản chi"
                onPress={() => save.mutate()}
                loading={save.isPending}
              />
            </View>
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {phase === "saved" && (
        <Card style={{ alignItems: "center", paddingVertical: 32, backgroundColor: colors.tintGreen }}>
          <Check color={colors.success} size={40} />
          <Text style={styles.savedTitle}>Đã lưu vào chi tiêu</Text>
        </Card>
      )}

      {phase === "error" && (
        <View>
          <Card style={styles.errCard}>
            <AlertTriangle color={colors.emergency} size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errTitle}>Không quét được</Text>
              <Text style={styles.errSub}>{error}</Text>
            </View>
          </Card>
          <Pressable style={styles.secondaryBtn} onPress={reset}>
            <RotateCcw color={colors.foreground} size={18} />
            <Text style={styles.secondaryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 24, marginBottom: 16, backgroundColor: colors.tintBlue },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontWeight: "700", marginTop: 8, color: colors.foreground },
  heroSub: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  secondaryText: { fontWeight: "700", color: colors.foreground },
  scanWrap: { borderRadius: radius.xl, overflow: "hidden", marginBottom: 16 },
  preview: { width: "100%", height: 280 },
  previewSmall: { width: "100%", height: 160, borderRadius: radius.lg },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.35)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scanText: { fontWeight: "700", color: colors.white },
  scanSub: { fontSize: 12, color: colors.white },
  label: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 8, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: colors.white },
  totalLabel: { fontSize: 12, color: colors.muted },
  totalAmount: { fontSize: 22, fontWeight: "800", color: colors.foreground, marginTop: 4 },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 16, alignItems: "center" },
  errCard: { flexDirection: "row", gap: 12, marginBottom: 16, backgroundColor: colors.tintOrange },
  errTitle: { fontWeight: "700", color: colors.foreground },
  errSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  savedTitle: { fontWeight: "700", marginTop: 12, color: colors.foreground },
});
