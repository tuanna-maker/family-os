import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import { PrimaryButton } from "@mobile/components/ui";
import type { ElderlyProfileRow, SafeCheckRow } from "@mobile/api/elderly-care";
import { formatRelativeAgo } from "@mobile/i18n/format";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

function statusColors(colors: ReturnType<typeof useTheme>["colors"], s: string) {
  if (s === "ok") return { bg: colors.tintGreen, dot: colors.success };
  if (s === "warn") return { bg: colors.tintOrange, dot: colors.warning };
  return { bg: colors.tintRed, dot: colors.emergency };
}

export function SafeCheckPanel({
  profile,
  history,
  historyLoading,
  note,
  onNoteChange,
  onConfirm,
  isPending,
}: {
  profile: ElderlyProfileRow;
  history: SafeCheckRow[];
  historyLoading: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onConfirm: (status: "ok" | "warn" | "alert", note?: string) => void;
  isPending: boolean;
}) {
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const ec = s.elderlyCare;
  const [picked, setPicked] = useState<"ok" | "warn" | "alert">("ok");
  const banner = statusColors(colors, profile.safe_status);

  const statusLabel = useMemo(
    () =>
      ({
        ok: ec.statusOk,
        warn: ec.statusWarn,
        alert: ec.statusAlert,
      }) as Record<string, string>,
    [ec.statusOk, ec.statusWarn, ec.statusAlert],
  );

  const statusOptions = useMemo(
    () =>
      [
        { key: "ok" as const, label: ec.statusOk, emoji: "✅" },
        { key: "warn" as const, label: ec.statusWarn, emoji: "⚠️" },
        { key: "alert" as const, label: ec.statusAlert, emoji: "🚨" },
      ] as const,
    [ec.statusOk, ec.statusWarn, ec.statusAlert],
  );

  const styles = useThemedStyles((c, fontScale) => ({
    banner: {
      flexDirection: "row" as const,
      gap: 10,
      padding: 14,
      borderRadius: radius.lg,
      backgroundColor: banner.bg,
      marginBottom: 12,
    },
    bannerTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    bannerSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    bannerMeta: { fontSize: 11 * fontScale, color: c.muted, marginTop: 4 },
    statusRow: { flexDirection: "row" as const, gap: 8, marginBottom: 10 },
    statusBtn: {
      flex: 1,
      alignItems: "center" as const,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    statusBtnActive: { backgroundColor: c.foreground, borderColor: c.foreground },
    statusEmoji: { fontSize: 18, marginBottom: 4 },
    statusLabel: { fontSize: 11 * fontScale, fontWeight: "600" as const, color: c.foreground },
    statusLabelActive: { color: c.background },
    noteInput: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14 * fontScale,
      color: c.foreground,
      backgroundColor: c.card,
      minHeight: 64,
      textAlignVertical: "top" as const,
      marginBottom: 10,
    },
    histTitle: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.muted, marginBottom: 8 },
    histItem: {
      flexDirection: "row" as const,
      gap: 8,
      padding: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 6,
    },
    histDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
    histStatus: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.foreground },
    histNote: { fontSize: 11 * fontScale, color: c.muted },
    histTime: { fontSize: 10 * fontScale, color: c.muted, marginTop: 2 },
  }));

  return (
    <View>
      <View style={styles.banner}>
        <CheckCircle2 color={banner.dot} size={26} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>
            {ec.safeCheck} · {statusLabel[profile.safe_status]}
          </Text>
          <Text style={styles.bannerSub} numberOfLines={2}>
            {profile.safe_note ?? ec.noSafeCheckNote}
          </Text>
          <Text style={styles.bannerMeta}>
            {profile.safe_last_at
              ? ec.lastConfirmed(formatRelativeAgo(profile.safe_last_at, locale))
              : ec.neverConfirmed}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        {statusOptions.map((opt) => {
          const active = picked === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.statusBtn, active && styles.statusBtnActive]}
              onPress={() => setPicked(opt.key)}
            >
              <Text style={styles.statusEmoji}>{opt.emoji}</Text>
              <Text style={[styles.statusLabel, active && styles.statusLabelActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={onNoteChange}
        placeholder={ec.safeCheckNotePlaceholder}
        placeholderTextColor={colors.muted}
        multiline
        maxLength={300}
      />

      <PrimaryButton
        label={isPending ? ec.confirming : ec.confirmWithStatus(statusLabel[picked])}
        onPress={() => onConfirm(picked, note.trim() || undefined)}
        loading={isPending}
        disabled={isPending}
      />

      <Text style={[styles.histTitle, { marginTop: 14 }]}>{ec.safeCheckHistory}</Text>
      {historyLoading ? (
        <ActivityIndicator color={colors.brand} />
      ) : history.length === 0 ? (
        <Text style={styles.histNote}>{ec.noSafeCheckHistory}</Text>
      ) : (
        history.slice(0, 3).map((h) => {
          const sc = statusColors(colors, h.status);
          return (
            <View key={h.id} style={styles.histItem}>
              <View style={[styles.histDot, { backgroundColor: sc.dot }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.histStatus}>
                  {statusLabel[h.status]}
                  {h.author_name ? ` · ${h.author_name}` : ""}
                </Text>
                {h.note ? (
                  <Text style={styles.histNote} numberOfLines={1}>
                    {h.note}
                  </Text>
                ) : null}
                <Text style={styles.histTime}>{formatRelativeAgo(h.checked_at, locale)}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
