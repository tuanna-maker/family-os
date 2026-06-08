import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import {
  deleteReadNotifications,
  listNotifications,
  markAllRead,
  markRead,
} from "@mobile/api/notifications";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDateTime } from "@mobile/i18n/format";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { toast } from "@mobile/utils/toast";

function invalidateNotificationQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["notifications-all"] });
  void qc.invalidateQueries({ queryKey: ["notifications-unread"] });
}

export default function ThongBaoScreen() {
  const qc = useQueryClient();
  const { locale, s } = useI18n();
  const n = s.screens.notifications;
  const styles = useThemedStyles((c) => ({
    muted: { color: c.muted },
    row: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, marginBottom: 10 },
    unread: { borderColor: c.brand, borderWidth: 1 },
    title: { fontWeight: "700" as const, color: c.foreground },
    body: { color: c.muted, marginTop: 4, fontSize: 13 },
    time: { color: c.muted, fontSize: 11, marginTop: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand, marginTop: 6 },
    actions: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 8 },
    secondaryBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
    },
    secondaryText: { fontSize: 13, fontWeight: "600" as const, color: c.foreground },
  }));

  const q = useQuery({
    queryKey: ["notifications-all"],
    queryFn: () => listNotifications({ limit: 50, offset: 0 }),
    refetchInterval: 30_000,
  });

  const rows = q.data?.rows ?? [];
  const unread = rows.filter((item) => !item.read_at).length;
  const readCount = rows.filter((item) => item.read_at).length;

  const markOne = useMutation({
    mutationFn: markRead,
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["notifications-all"] });
      const prev = qc.getQueryData<Awaited<ReturnType<typeof listNotifications>>>(["notifications-all"]);
      if (prev) {
        qc.setQueryData(["notifications-all"], {
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === id ? { ...r, read_at: new Date().toISOString() } : r,
          ),
        });
      }
      qc.setQueryData(["notifications-unread"], (old: { count: number } | undefined) => ({
        count: Math.max(0, (old?.count ?? unread) - 1),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications-all"], ctx.prev);
      invalidateNotificationQueries(qc);
    },
    onSettled: () => invalidateNotificationQueries(qc),
  });

  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => invalidateNotificationQueries(qc),
  });

  const deleteRead = useMutation({
    mutationFn: deleteReadNotifications,
    onSuccess: () => {
      invalidateNotificationQueries(qc);
      toast.success(n.deleteRead);
    },
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={unread > 0 ? n.titleUnread(unread) : n.title}
        back="/(tabs)/tai-khoan"
      />
      <View style={styles.actions}>
        {unread > 0 ? (
          <PrimaryButton
            label={n.markAllRead}
            onPress={() => markAll.mutate()}
            loading={markAll.isPending}
          />
        ) : null}
        {readCount > 0 ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => deleteRead.mutate()}
            disabled={deleteRead.isPending}
          >
            <Text style={styles.secondaryText}>{n.deleteRead}</Text>
          </Pressable>
        ) : null}
      </View>
      {rows.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{n.emptyList}</Text>
        </Card>
      ) : (
        rows.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              if (!item.read_at) markOne.mutate({ id: item.id });
            }}
          >
            <Card style={{ ...styles.row, ...(!item.read_at ? styles.unread : {}) }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                <Text style={styles.time}>{formatDateTime(item.created_at, locale)}</Text>
              </View>
              {!item.read_at ? <View style={styles.dot} /> : null}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
