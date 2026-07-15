import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
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
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import { scanReceipt, type ScanResult } from "@mobile/api/scan-receipt";
import { createExpense } from "@mobile/api/expenses";
import { uriToDataUrl } from "@mobile/lib/image-data-url";
import { formatAmountDigits, formatAmountInputChange, parseAmountDigits } from "@mobile/lib/amount-input";
import { normalizeSpentOn } from "@mobile/lib/expense-month";
import { getCategoryLabel } from "@mobile/components/family/CategoryMeta";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatCurrency } from "@mobile/i18n/format";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { toast } from "@mobile/utils/toast";

type Phase = "capture" | "scanning" | "review" | "saved" | "error";

export default function ChiTieuScanScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const { settings } = useExpenseSettings(familyId);
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const ex = s.expense;
  const sc = ex.scan;
  const c = s.common;
  const styles = useStyles();

  const categoryKeys = settings?.categories.map((cat) => cat.key) ?? ["dining", "other"];

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
      const normalized = {
        ...res.result,
        date: normalizeSpentOn(res.result.date),
        category: categoryKeys.includes(res.result.category) ? res.result.category : categoryKeys[0],
      };
      setResult(normalized);
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
        spent_on: normalizeSpentOn(result.date),
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
              value={result.total > 0 ? formatAmountDigits(result.total, locale) : ""}
              onChangeText={(v) =>
                setResult({ ...result, total: parseAmountDigits(formatAmountInputChange(v, locale)) })
              }
              keyboardType="numeric"
            />
            <DateField
              label={sc.date}
              value={result.date}
              onChange={(v) => setResult({ ...result, date: v })}
            />
            <FieldLabel>{ex.category}</FieldLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={styles.chips}>
                {categoryKeys.map((key) => (
                  <SelectChip
                    key={key}
                    label={getCategoryLabel(key, locale, settings?.categories)}
                    active={result.category === key}
                    onPress={() => setResult({ ...result, category: key })}
                  />
                ))}
              </View>
            </ScrollView>
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

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    hero: { alignItems: "center" as const, paddingVertical: 24, marginBottom: 16, backgroundColor: c.tintBlue },
    heroEmoji: { fontSize: 40 },
    heroTitle: { fontWeight: "700" as const, marginTop: 8, color: c.foreground, fontSize: 16 * fontScale },
    heroSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4, textAlign: "center" as const },
    secondaryBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      padding: 14,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    secondaryText: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    scanWrap: { borderRadius: radius.xl, overflow: "hidden" as const, marginBottom: 16 },
    preview: { width: "100%" as const, height: 280 },
    previewSmall: { width: "100%" as const, height: 160, borderRadius: radius.lg },
    scanOverlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15,23,42,0.35)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
    },
    scanText: { fontWeight: "700" as const, color: c.white },
    scanSub: { fontSize: 12 * fontScale, color: c.white },
    chips: { flexDirection: "row" as const, gap: 8 },
    totalLabel: { fontSize: 12 * fontScale, color: c.muted },
    totalAmount: { fontSize: 22 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 4 },
    rowBtns: { flexDirection: "row" as const, gap: 10, marginTop: 16, alignItems: "center" as const },
    errCard: { flexDirection: "row" as const, gap: 12, marginBottom: 16, backgroundColor: c.tintOrange },
    errTitle: { fontWeight: "700" as const, color: c.foreground, fontSize: 14 * fontScale },
    errSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },
    savedTitle: { fontWeight: "700" as const, marginTop: 12, color: c.foreground, fontSize: 15 * fontScale },
  }));
}
