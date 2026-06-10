import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  Building2,
  ChevronRight,
  Flame,
  Home,
  Package,
  ShieldAlert,
  UserX,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { PlatformNotification } from "@guard/api/notifications";
import {
  useGuardNotifications,
  type GuardResidentInboxItem,
} from "@mobile/hooks/useGuardNotifications";
import { useTabScrollPadding } from "@mobile/hooks/useTabScrollPadding";
import { formatNotifTime, REQUEST_TYPE_LABEL } from "@mobile/utils/guardFormat";
import { useTheme } from "@mobile/theme/themeStore";
import { radius } from "@mobile/theme/colors";

type TabKey = "resident" | "company";

type CardTone = {
  accent: string;
  chipBg: string;
  chipFg: string;
  iconBg: string;
  iconFg: string;
  Icon: LucideIcon;
};

function residentTone(item: GuardResidentInboxItem, isDark: boolean): CardTone {
  const body = (item.body ?? "").toLowerCase();
  if (item.isAlert || item.title.includes("SOS")) {
    return {
      accent: "#EF4444",
      chipBg: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)",
      chipFg: "#EF4444",
      iconBg: isDark ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.14)",
      iconFg: "#EF4444",
      Icon: ShieldAlert,
    };
  }
  if (body.includes("cháy") || body.includes("fire")) {
    return {
      accent: "#F97316",
      chipBg: isDark ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.12)",
      chipFg: "#F97316",
      iconBg: isDark ? "rgba(249,115,22,0.22)" : "rgba(249,115,22,0.14)",
      iconFg: "#F97316",
      Icon: Flame,
    };
  }
  if (body.includes("nhận hàng") || body.includes("package")) {
    return {
      accent: "#3B82F6",
      chipBg: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.12)",
      chipFg: "#3B82F6",
      iconBg: isDark ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.14)",
      iconFg: "#3B82F6",
      Icon: Package,
    };
  }
  if (body.includes("xâm nhập") || body.includes("intrusion")) {
    return {
      accent: "#F59E0B",
      chipBg: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.12)",
      chipFg: "#F59E0B",
      iconBg: isDark ? "rgba(245,158,11,0.22)" : "rgba(245,158,11,0.14)",
      iconFg: "#F59E0B",
      Icon: UserX,
    };
  }
  return {
    accent: "#6366F1",
    chipBg: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)",
    chipFg: "#6366F1",
    iconBg: isDark ? "rgba(99,102,241,0.22)" : "rgba(99,102,241,0.14)",
    iconFg: "#6366F1",
    Icon: Bell,
  };
}

function typeLabelFromBody(body: string) {
  for (const label of Object.values(REQUEST_TYPE_LABEL)) {
    if (body.includes(label)) return label;
  }
  const parts = body.split(" · ");
  return parts[parts.length - 1] ?? "Yêu cầu";
}

function InboxCard({
  title,
  body,
  time,
  unread,
  tone,
  statusLabel,
  onPress,
}: {
  title: string;
  body?: string | null;
  time: string;
  unread: boolean;
  tone: CardTone;
  statusLabel?: string;
  onPress: () => void;
}) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const { Icon } = tone;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: unread ? tone.accent : colors.cardBorder,
            ...Platform.select({
              ios: {
                shadowColor: isDark ? "#000" : tone.accent,
                shadowOffset: { width: 0, height: unread ? 4 : 2 },
                shadowOpacity: unread ? 0.14 : 0.06,
                shadowRadius: unread ? 10 : 6,
              },
              android: { elevation: unread ? 3 : 1 },
            }),
          },
          unread && { borderWidth: 1.5 },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: tone.iconBg }]}>
          <Icon size={22} color={tone.iconFg} strokeWidth={2.2} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
              {title}
            </Text>
            {unread ? <View style={[styles.unreadDot, { backgroundColor: tone.accent }]} /> : null}
          </View>

          {body ? (
            <Text style={[styles.cardBody, { color: colors.muted }]} numberOfLines={2}>
              {body}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={[styles.cardTime, { color: colors.muted }]}>{time}</Text>
            {statusLabel ? (
              <View style={[styles.statusChip, { backgroundColor: tone.chipBg }]}>
                <Text style={[styles.statusText, { color: tone.chipFg }]}>{statusLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <ChevronRight size={18} color={colors.muted} style={styles.chevron} />
      </View>
    </Pressable>
  );
}

const ResidentCard = memo(function ResidentCard({
  item,
  onPress,
  timeTick,
}: {
  item: GuardResidentInboxItem;
  onPress: () => void;
  timeTick: number;
}) {
  const { theme } = useTheme();
  const tone = residentTone(item, theme === "dark");
  const chip = typeLabelFromBody(item.body ?? "");
  const time = useMemo(
    () => formatNotifTime(item.created_at),
    [item.created_at, timeTick],
  );

  return (
    <InboxCard
      title={item.title}
      body={item.body}
      time={time}
      unread={!item.read}
      tone={tone}
      statusLabel={chip}
      onPress={onPress}
    />
  );
});

const CompanyCard = memo(function CompanyCard({
  item,
  onPress,
  timeTick,
}: {
  item: PlatformNotification;
  onPress: () => void;
  timeTick: number;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const read = !!item.read_at;
  const time = useMemo(
    () => formatNotifTime(item.created_at),
    [item.created_at, timeTick],
  );
  const isSos = item.topic.startsWith("sos.");
  const tone: CardTone = isSos
    ? {
        accent: "#EF4444",
        chipBg: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)",
        chipFg: "#EF4444",
        iconBg: isDark ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.14)",
        iconFg: "#EF4444",
        Icon: ShieldAlert,
      }
    : {
        accent: "#2563EB",
        chipBg: isDark ? "rgba(37,99,235,0.2)" : "rgba(37,99,235,0.12)",
        chipFg: "#2563EB",
        iconBg: isDark ? "rgba(37,99,235,0.22)" : "rgba(37,99,235,0.14)",
        iconFg: "#2563EB",
        Icon: Bell,
      };

  return (
    <InboxCard
      title={item.title}
      body={item.body}
      time={time}
      unread={!read}
      tone={tone}
      statusLabel={isSos ? "Khẩn cấp" : "Nội bộ"}
      onPress={onPress}
    />
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabPad = useTabScrollPadding();
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<TabKey>("resident");
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTimeTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const {
    residentItems,
    companyItems,
    residentUnread,
    companyUnread,
    residentReadCount,
    companyReadCount,
    isLoading,
    markRead,
    markAllRead,
    deleteRead,
    openRequestCount,
  } = useGuardNotifications();

  const title = useMemo(() => {
    const unread = tab === "resident" ? residentUnread : companyUnread;
    return unread > 0 ? `Thông báo (${unread})` : "Thông báo";
  }, [tab, residentUnread, companyUnread]);

  const openResident = (item: GuardResidentInboxItem) => {
    if (!item.read) void markRead(item.notificationId);
    router.push("/requests");
  };

  const openCompany = (item: PlatformNotification) => {
    if (!item.read_at) void markRead(item.id);
  };

  const tabUnread = tab === "resident" ? residentUnread : companyUnread;
  const tabReadCount = tab === "resident" ? residentReadCount : companyReadCount;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[tabPad, { paddingBottom: tabPad.paddingBottom + 12 }]}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 48) }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
          {openRequestCount > 0 ? (
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              {openRequestCount} yêu cầu cư dân đang chờ xử lý
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {tabUnread > 0 ? (
            <Pressable onPress={() => void markAllRead(tab)} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.brand }]}>Đánh dấu đã đọc</Text>
            </Pressable>
          ) : null}
          {tabReadCount > 0 ? (
            <Pressable onPress={() => void deleteRead(tab)} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.muted }]}>Xóa đã đọc</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.segment, { backgroundColor: isDark ? colors.card : colors.mutedBg }]}>
        <Pressable
          onPress={() => setTab("resident")}
          style={[
            styles.segmentBtn,
            tab === "resident" && {
              backgroundColor: colors.card,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                },
                android: { elevation: 2 },
              }),
            },
          ]}
        >
          <Home size={16} color={tab === "resident" ? colors.brand : colors.muted} />
          <Text
            style={[
              styles.segmentLabel,
              { color: tab === "resident" ? colors.foreground : colors.muted },
            ]}
            numberOfLines={1}
          >
            Yêu cầu cư dân
          </Text>
          {residentUnread > 0 ? (
            <View style={[styles.segmentBadge, { backgroundColor: colors.emergency }]}>
              <Text style={styles.segmentBadgeText}>
                {residentUnread > 99 ? "99+" : residentUnread}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => setTab("company")}
          style={[
            styles.segmentBtn,
            tab === "company" && {
              backgroundColor: colors.card,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                },
                android: { elevation: 2 },
              }),
            },
          ]}
        >
          <Building2 size={16} color={tab === "company" ? colors.brand : colors.muted} />
          <Text
            style={[
              styles.segmentLabel,
              { color: tab === "company" ? colors.foreground : colors.muted },
            ]}
            numberOfLines={1}
          >
            Công ty
          </Text>
          {companyUnread > 0 ? (
            <View style={[styles.segmentBadge, { backgroundColor: colors.emergency }]}>
              <Text style={styles.segmentBadgeText}>
                {companyUnread > 99 ? "99+" : companyUnread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.list}>
        {isLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 32 }} />
        ) : tab === "resident" ? (
          residentItems.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Bell size={32} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Chưa có yêu cầu mới
              </Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Khi cư dân gửi SOS hoặc yêu cầu bảo an, bạn sẽ thấy tại đây.
              </Text>
            </View>
          ) : (
            residentItems.map((item) => (
              <ResidentCard
                key={item.id}
                item={item}
                timeTick={timeTick}
                onPress={() => openResident(item)}
              />
            ))
          )
        ) : companyItems.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Building2 size={32} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Chưa có thông báo công ty
            </Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Lịch trực, ca làm việc và thông báo nội bộ sẽ hiển thị tại đây.
            </Text>
          </View>
        ) : (
          companyItems.map((item) => (
            <CompanyCard
              key={item.id}
              item={item}
              timeTick={timeTick}
              onPress={() => openCompany(item)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 4,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 6,
    paddingTop: 2,
  },
  headerAction: {
    fontSize: 13,
    fontWeight: "600",
  },
  segment: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 4,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    minWidth: 0,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  segmentBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingRight: 4,
    minHeight: 80,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    marginVertical: 14,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  cardTime: {
    fontSize: 11,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  chevron: {
    marginRight: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
