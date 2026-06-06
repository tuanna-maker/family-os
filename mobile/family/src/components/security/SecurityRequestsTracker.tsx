import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react-native";
import { Card } from "@mobile/components/ui";
import { listSecurityRequests } from "@mobile/api/security";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_TYPE_EMOJI,
  REQUEST_TYPE_LABEL,
} from "@mobile/constants/security";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

function fmtElapsed(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function statusTone(colors: ReturnType<typeof useTheme>["colors"], status: string) {
  if (status === "in_progress") return { bg: colors.tintBlue, fg: colors.brand };
  if (status === "resolved") return { bg: colors.tintGreen, fg: colors.success };
  if (status === "cancelled") return { bg: colors.mutedBg, fg: colors.muted };
  return { bg: colors.tintOrange, fg: colors.warning };
}

export function SecurityRequestsTracker() {
  const { colors } = useTheme();
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
        <Text style={styles.headTitle}>Trạng thái điều phối</Text>
        <Text style={styles.headSub}>Yêu cầu của bạn — cập nhật realtime</Text>
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
            <Text style={styles.rowTitle}>Chưa có yêu cầu nào đang mở</Text>
            <Text style={styles.rowMeta}>Khi bạn gửi SOS, trạng thái sẽ hiển thị ở đây.</Text>
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
                  {REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}
                </Text>
                <Text style={[styles.badge, { backgroundColor: tone.bg, color: tone.fg }]}>
                  {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                </Text>
                <Text style={styles.rowMeta}>Gửi {fmtElapsed(r.created_at)}</Text>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}
