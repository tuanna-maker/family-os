import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { DotPagination } from "@mobile/components/ui/DotPagination";
import { listSecurityRequests } from "@mobile/api/security";
import type { SecurityRequest } from "@mobile/api/security";
import { REQUEST_TYPE_EMOJI, getRequestStatusLabel, getRequestTypeLabel } from "@mobile/constants/security";
import { formatRelativeAgo } from "@mobile/i18n/format";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { getSupabase } from "@shared/supabase/get-client";
import { useAuth } from "@mobile/hooks/useAuth";
import { useEffect } from "react";

const PAGE_SIZE = 10;

function statusTone(colors: ReturnType<typeof useTheme>["colors"], status: string) {
  if (status === "in_progress") return { bg: colors.tintBlue, fg: colors.brand };
  if (status === "resolved") return { bg: colors.tintGreen, fg: colors.success };
  if (status === "cancelled") return { bg: colors.mutedBg, fg: colors.muted };
  return { bg: colors.tintOrange, fg: colors.warning };
}

function patchPreviewList(rows: SecurityRequest[], row: SecurityRequest, event: string) {
  const without = rows.filter((r) => r.id !== row.id);
  if (event === "DELETE") return without;
  return [row, ...without];
}

export default function BaoAnYeuCauScreen() {
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const sec = s.security;
  const { session } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);

  const q = useQuery({
    queryKey: ["security-requests", "all", page],
    queryFn: () => listSecurityRequests({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    const supabase = getSupabase();
    const ch = supabase
      .channel(`family-security-all-${userId}`)
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
          qc.setQueriesData<{ rows: SecurityRequest[]; total: number; limit: number; offset: number }>(
            { queryKey: ["security-requests", "all"] },
            (old) => {
              if (!old) return old;
              const nextRows = patchPreviewList(old.rows, row, payload.eventType);
              return {
                ...old,
                rows: nextRows.slice(0, old.limit),
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
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 10 },
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
    muted: { color: c.muted, fontSize: 13 * fontScale },
    empty: { padding: 24, alignItems: "center" as const },
    pageInfo: { textAlign: "center" as const, fontSize: 12 * fontScale, color: c.muted, marginTop: 4 },
  }));

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        eyebrow={sec.eyebrow}
        title={sec.allRequestsTitle}
        subtitle={sec.allRequestsSub}
        back="/(tabs)/bao-an"
      />

      {q.isLoading && rows.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : rows.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.muted}>{sec.noRequests}</Text>
        </Card>
      ) : (
        <>
          {rows.map((r) => {
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
          })}
          <DotPagination page={page} totalPages={totalPages} onPage={setPage} />
          {total > 0 ? (
            <Text style={styles.pageInfo}>
              {page + 1} / {totalPages} · {total} yêu cầu
            </Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}
