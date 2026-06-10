import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ShieldCheck } from "lucide-react-native";
import { Card } from "@mobile/components/ui";
import { cancelSecurityRequest, listSecurityRequests, type SecurityRequest } from "@mobile/api/security";
import { toast } from "@mobile/utils/toast";
import { useAppAlert } from "@mobile/components/AppAlert";
import { REQUEST_TYPE_EMOJI, getRequestStatusLabel, getRequestTypeLabel } from "@mobile/constants/security";
import { formatRelativeAgo } from "@mobile/i18n/format";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { getSupabase } from "@shared/supabase/get-client";
import { useAuth } from "@mobile/hooks/useAuth";
import { useEffect } from "react";

function statusTone(colors: ReturnType<typeof useTheme>["colors"], status: string) {
  if (status === "in_progress") return { bg: colors.tintBlue, fg: colors.brand };
  if (status === "resolved") return { bg: colors.tintGreen, fg: colors.success };
  if (status === "cancelled") return { bg: colors.mutedBg, fg: colors.muted };
  return { bg: colors.tintOrange, fg: colors.warning };
}

export function SecurityRequestsTracker() {
  const router = useRouter();
  const qc = useQueryClient();
  const alert = useAppAlert();
  const { session } = useAuth();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const sec = s.security;
  const q = useQuery({
    queryKey: ["security-requests", "preview"],
    queryFn: () => listSecurityRequests({ limit: 3, offset: 0 }),
    staleTime: 20_000,
  });
  const items = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const supabase = getSupabase();
    const ch = supabase
      .channel(`family-security-requests-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "security_requests",
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as SecurityRequest;
          if (!row?.id) return;
          qc.setQueryData(
            ["security-requests", "preview"],
            (old: Awaited<ReturnType<typeof listSecurityRequests>> | undefined) => {
              if (!old) return old;
              const without = old.rows.filter((r) => r.id !== row.id);
              const merged =
                payload.eventType === "DELETE" ? without : [row, ...without];
              return {
                ...old,
                rows: merged.slice(0, 3),
                total:
                  payload.eventType === "INSERT"
                    ? old.total + 1
                    : payload.eventType === "DELETE"
                      ? Math.max(0, old.total - 1)
                      : old.total,
              };
            },
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc, session?.user?.id]);

  const styles = useThemedStyles((c, fontScale) => ({
    head: { flexDirection: "row" as const, alignItems: "flex-start" as const, marginBottom: 10, marginTop: 16 },
    headText: { flex: 1 },
    headTitle: { fontSize: 17 * fontScale, fontWeight: "600" as const, color: c.foreground },
    headSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    viewAll: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
      paddingTop: 2,
    },
    viewAllText: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.brand },
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
    cancelBtn: { marginTop: 6, alignSelf: "flex-start" as const },
    cancelText: { fontSize: 12 * fontScale, fontWeight: "600" as const, color: c.emergency },
  }));

  const onCancel = (id: string) => {
    alert.confirm({
      title: "Huỷ yêu cầu?",
      message: "Yêu cầu đang chờ xử lý sẽ bị huỷ.",
      confirmText: "Huỷ yêu cầu",
      destructive: true,
      onConfirm: () => {
        void (async () => {
          try {
            await cancelSecurityRequest({ id });
            void qc.invalidateQueries({ queryKey: ["security-requests"] });
            toast.success("Đã huỷ yêu cầu");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Huỷ thất bại");
          }
        })();
      },
    });
  };

  return (
    <View>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{sec.trackerTitle}</Text>
          <Text style={styles.headSub}>{sec.trackerSub}</Text>
        </View>
        {total > 3 ? (
          <Pressable
            style={styles.viewAll}
            onPress={() => router.push("/bao-an/yeu-cau")}
            hitSlop={8}
          >
            <Text style={styles.viewAllText}>{sec.viewAllRequests}</Text>
            <ChevronRight size={16} color={colors.brand} />
          </Pressable>
        ) : null}
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
        <>
          {items.map((r) => {
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
                  {r.status === "open" ? (
                    <Pressable style={styles.cancelBtn} onPress={() => onCancel(r.id)} hitSlop={8}>
                      <Text style={styles.cancelText}>Huỷ yêu cầu</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </View>
  );
}
