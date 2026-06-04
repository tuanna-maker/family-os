import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { colors } from "@mobile/theme/colors";
import { listNotifications, markAllRead, markRead } from "@mobile/api/notifications";

export default function ThongBaoScreen() {
  const qc = useQueryClient();
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

  const unread = (q.data?.rows ?? []).filter((n) => !n.read_at).length;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Thông báo" back="/(tabs)/tai-khoan" />
      {unread > 0 && (
        <PrimaryButton
          label="Đánh dấu tất cả đã đọc"
          onPress={() => markAll.mutate()}
          loading={markAll.isPending}
        />
      )}
      <View style={{ height: 8 }} />
      {(q.data?.rows ?? []).length === 0 ? (
        <Card>
          <Text style={styles.muted}>Chưa có thông báo.</Text>
        </Card>
      ) : (
        (q.data?.rows ?? []).map((n) => (
          <Pressable key={n.id} onPress={() => !n.read_at && markOne.mutate({ id: n.id })}>
            <Card style={{ ...styles.row, ...(!n.read_at ? styles.unread : {}) }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{n.title}</Text>
                {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
                <Text style={styles.time}>{new Date(n.created_at).toLocaleString("vi-VN")}</Text>
              </View>
              {!n.read_at && <View style={styles.dot} />}
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
