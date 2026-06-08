import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react-native";
import { Card } from "@mobile/components/ui";
import { listSecurityRequests } from "@mobile/api/security";
import { REQUEST_TYPE_EMOJI, getRequestStatusLabel, getRequestTypeLabel } from "@mobile/constants/security";
import { formatRelativeAgo } from "@mobile/i18n/format";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

function statusTone(colors: ReturnType<typeof useTheme>["colors"], status: string) {
  if (status === "in_progress") return { bg: colors.tintBlue, fg: colors.brand };
  if (status === "resolved") return { bg: colors.tintGreen, fg: colors.success };
  if (status === "cancelled") return { bg: colors.mutedBg, fg: colors.muted };
  return { bg: colors.tintOrange, fg: colors.warning };
}

export function SecurityRequestsTracker() {
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const sec = s.security;
  const q = useQuery({
    queryKey: ["security-requests"],
    queryFn: () => listSecurityRequests(),
  });
  const items = (q.data ?? []).slice(0, 5);

  const styles = useThemedStyles((c, fontScale) => ({
    head: { marginBottom: 10, marginTop: 16 },
    headTitle: { fontSize: 17 * fontScale, fontWeight: "600" as const, color: c.foreground },
    headSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    emptyRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    emptyIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.tintGreen,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 8 },
    emojiBox: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: c.tintRed,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    emoji: { fontSize: 22 },
    rowTitle: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground },
    badge: {
      alignSelf: "flex-start" as const,
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      fontSize: 10,
      fontWeight: "700" as const,
    },
    rowMeta: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
  }));

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.headTitle}>{sec.trackerTitle}</Text>
        <Text style={styles.headSub}>{sec.trackerSub}</Text>
      </View>

      {q.isLoading ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator color={colors.brand} />
        </Card>
      ) : items.length === 0 ? (
        <Card style={styles.emptyRow}>
          <View style={styles.emptyIcon}>
            <ShieldCheck color={colors.success} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{sec.noOpenRequests}</Text>
            <Text style={styles.rowMeta}>{sec.noOpenRequestsSub}</Text>
          </View>
        </Card>
      ) : (
        items.map((r) => {
          const tone = statusTone(colors, r.status);
          return (
            <Card key={r.id} style={styles.row}>
              <View style={styles.emojiBox}>
                <Text style={styles.emoji}>{REQUEST_TYPE_EMOJI[r.request_type] ?? "📞"}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {getRequestTypeLabel(r.request_type, locale)}
                </Text>
                <Text style={[styles.badge, { backgroundColor: tone.bg, color: tone.fg }]}>
                  {getRequestStatusLabel(r.status, locale)}
                </Text>
                <Text style={styles.rowMeta}>{sec.sentAgo(formatRelativeAgo(r.created_at, locale))}</Text>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}
