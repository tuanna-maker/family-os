import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { colors } from "@mobile/theme/colors";
import { listNotifications, markAllRead, markRead } from "@mobile/api/notifications";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDateTime } from "@mobile/i18n/format";

export default function ThongBaoScreen() {
  const qc = useQueryClient();
  const { locale, s } = useI18n();
  const n = s.screens.notifications;
  const q = useQuery({
    queryKey: ["notifications-all"],
    queryFn: () => listNotifications({ limit: 50, offset: 0 }),
  });

  const markOne = useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  const markAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  const unread = (q.data?.rows ?? []).filter((item) => !item.read_at).length;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={n.title} back="/(tabs)/tai-khoan" />
      {unread > 0 && (
        <PrimaryButton
          label={n.markAllRead}
          onPress={() => markAll.mutate()}
          loading={markAll.isPending}
        />
      )}
      <View style={{ height: 8 }} />
      {(q.data?.rows ?? []).length === 0 ? (
        <Card>
          <Text style={styles.muted}>{n.emptyList}</Text>
        </Card>
      ) : (
        (q.data?.rows ?? []).map((item) => (
          <Pressable key={item.id} onPress={() => !item.read_at && markOne.mutate({ id: item.id })}>
            <Card style={{ ...styles.row, ...(!item.read_at ? styles.unread : {}) }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                <Text style={styles.time}>{formatDateTime(item.created_at, locale)}</Text>
              </View>
              {!item.read_at && <View style={styles.dot} />}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  unread: { borderColor: colors.brand, borderWidth: 1 },
  title: { fontWeight: "700", color: colors.foreground },
  body: { color: colors.muted, marginTop: 4, fontSize: 13 },
  time: { color: colors.muted, fontSize: 11, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 },
});
