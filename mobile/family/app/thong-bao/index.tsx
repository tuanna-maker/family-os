import { Pressable, Text, View } from "react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, SecondaryButton } from "@mobile/components/ui";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDateTime } from "@mobile/i18n/format";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { displayFamilyNotificationText } from "@mobile/lib/display-family-notification";
import { useFamilyNotificationInbox } from "@mobile/hooks/useFamilyNotificationInbox";
import { toast } from "@mobile/utils/toast";

export default function ThongBaoScreen() {
  const { locale, s } = useI18n();
  const n = s.screens.notifications;
  const { rows, unread, readCount, markOneFast, markAll, deleteRead } = useFamilyNotificationInbox();
  const styles = useThemedStyles((c) => ({
    muted: { color: c.muted },
    row: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, marginBottom: 10 },
    unread: { borderColor: c.brand, borderWidth: 1 },
    title: { fontWeight: "700" as const, color: c.foreground },
    body: { color: c.muted, marginTop: 4, fontSize: 13 },
    time: { color: c.muted, fontSize: 11, marginTop: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand, marginTop: 6 },
    actions: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      alignItems: "center" as const,
      gap: 8,
      marginBottom: 8,
    },
  }));

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
          <SecondaryButton
            label={n.deleteRead}
            onPress={() => {
              deleteRead.mutate(undefined, {
                onSuccess: () => toast.success(n.deleteRead),
              });
            }}
            loading={deleteRead.isPending}
          />
        ) : null}
      </View>
      {rows.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{n.emptyList}</Text>
        </Card>
      ) : (
        rows.map((item) => {
          const copy = displayFamilyNotificationText(item, locale);
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (!item.read_at) markOneFast(item.id);
              }}
            >
              <Card style={{ ...styles.row, ...(!item.read_at ? styles.unread : {}) }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{copy.title}</Text>
                  {copy.body ? <Text style={styles.body}>{copy.body}</Text> : null}
                  <Text style={styles.time}>{formatDateTime(item.created_at, locale)}</Text>
                </View>
                {!item.read_at ? <View style={styles.dot} /> : null}
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
