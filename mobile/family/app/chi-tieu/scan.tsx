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
import { getCategoryLabel } from "@mobile/components/family/CategoryMeta";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency } from "@mobile/i18n/format";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

type Phase = "capture" | "scanning" | "review" | "saved" | "error";

const CATEGORY_KEYS = ["Ăn uống", "Nhà cửa", "Con cái", "Sức khỏe", "Giải trí", "Khác"] as const;

export default function ChiTieuScanScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();
  const { locale, s } = useI18n();
  const ex = s.expense;
  const sc = ex.scan;
  const c = s.common;

  const [phase, setPhase] = useState<Phase>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const pickImage = async (useCamera: boolean) => {
    if (!familyId) {
      setError(c.noFamilyYet);
      setPhase("error");
      return;
    }
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(useCamera ? sc.needCamera : sc.needLibrary);
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
        setError(sc.imageTooLarge);
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
      setError(e instanceof Error ? e.message : sc.scanFailed);
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
      if (!result || !familyId) throw new Error(sc.missingData);
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
      toast.success(ex.savedExpense);
      setTimeout(() => router.replace("/chi-tieu"), 900);
    },
    onError: (e: Error) => {
      setError(e.message);
      setPhase("error");
    },
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={ex.scanEyebrow} title={ex.scanTitle} back="/chi-tieu" />

      {phase === "capture" && (
        <View>
          <Card style={styles.hero}>
            <Text style={styles.heroEmoji}>📸</Text>
            <Text style={styles.heroTitle}>{sc.heroTitle}</Text>
            <Text style={styles.heroSub}>{sc.heroSub}</Text>
          </Card>
          <PrimaryButton label={sc.takePhoto} onPress={() => pickImage(true)} />
          <View style={{ height: 10 }} />
          <Pressable style={styles.secondaryBtn} onPress={() => pickImage(false)}>
            <ImageIcon color={colors.foreground} size={20} />
            <Text style={styles.secondaryText}>{sc.pickLibrary}</Text>
          </Pressable>
        </View>
      )}

      {phase === "scanning" && preview && (
        <View style={styles.scanWrap}>
          <Image source={{ uri: preview }} style={styles.preview} />
          <View style={styles.scanOverlay}>
            <ActivityIndicator color={colors.brand} size="large" />
            <Text style={styles.scanText}>{sc.scanning}</Text>
            <Text style={styles.scanSub}>{sc.scanningSub}</Text>
          </View>
        </View>
      )}

      {phase === "review" && result && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {preview && <Image source={{ uri: preview }} style={styles.previewSmall} />}
          <Card style={{ marginTop: 12, gap: 4 }}>
            <TextField
              label={sc.merchant}
              value={result.merchant}
              onChangeText={(v) => setResult({ ...result, merchant: v })}
            />
            <TextField
              label={sc.amount}
              value={String(result.total)}
              onChangeText={(v) => setResult({ ...result, total: Number(v) || 0 })}
              keyboardType="numeric"
            />
            <DateField
              label={sc.date}
              value={result.date}
              onChange={(v) => setResult({ ...result, date: v })}
            />
            <FieldLabel>{ex.category}</FieldLabel>
            <View style={styles.chips}>
              {CATEGORY_KEYS.map((key) => (
                <SelectChip
                  key={key}
                  label={getCategoryLabel(key, locale)}
                  active={result.category === key}
                  onPress={() => setResult({ ...result, category: key })}
                />
              ))}
            </View>
          </Card>
          <Card style={{ marginTop: 12, backgroundColor: colors.tintGreen }}>
            <Text style={styles.totalLabel}>{sc.totalLabel}</Text>
            <Text style={styles.totalAmount}>{formatCurrency(result.total, locale)}</Text>
          </Card>
          <View style={styles.rowBtns}>
            <Pressable style={styles.secondaryBtn} onPress={reset}>
              <RotateCcw color={colors.foreground} size={18} />
              <Text style={styles.secondaryText}>{sc.rescan}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={sc.saveExpense}
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
          <Text style={styles.savedTitle}>{sc.savedTitle}</Text>
        </Card>
      )}

      {phase === "error" && (
        <View>
          <Card style={styles.errCard}>
            <AlertTriangle color={colors.emergency} size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errTitle}>{sc.failedTitle}</Text>
              <Text style={styles.errSub}>{error}</Text>
            </View>
          </Card>
          <Pressable style={styles.secondaryBtn} onPress={reset}>
            <RotateCcw color={colors.foreground} size={18} />
            <Text style={styles.secondaryText}>{sc.retry}</Text>
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  totalLabel: { fontSize: 12, color: colors.muted },
  totalAmount: { fontSize: 22, fontWeight: "800", color: colors.foreground, marginTop: 4 },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 16, alignItems: "center" },
  errCard: { flexDirection: "row", gap: 12, marginBottom: 16, backgroundColor: colors.tintOrange },
  errTitle: { fontWeight: "700", color: colors.foreground },
  errSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  savedTitle: { fontWeight: "700", marginTop: 12, color: colors.foreground },
});
