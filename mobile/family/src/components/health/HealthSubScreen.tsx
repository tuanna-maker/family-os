import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { appAlert } from "@mobile/utils/alert";
import { ChevronRight, Trash2 } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { LoadingState, EmptyState } from "@mobile/components/states";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { cardShadow, radius } from "@mobile/theme/colors";

export type HealthListItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  details?: string[];
  emoji?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
};

export function HealthSubScreen({
  title,
  subtitle,
  back = "/suc-khoe",
  loading,
  emptyTitle,
  emptyDescription,
  items,
  footer,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  items?: HealthListItem[];
  footer?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const styles = useSubStyles();
  const { s } = useI18n();

  if (loading) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title={title} subtitle={subtitle} back={back} />
        <LoadingState />
      </Screen>
    );
  }

  const showEmpty = items && items.length === 0 && !children;

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={title} subtitle={subtitle} back={back} />
      {actionLabel && onAction ? (
        <View style={{ marginBottom: 16 }}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
      {children}
      {showEmpty ? (
        <EmptyState title={emptyTitle ?? s.common.noData} description={emptyDescription} />
      ) : null}
      {items?.map((item) => (
        <HealthListCard key={item.id} item={item} styles={styles} />
      ))}
      {footer}
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function HealthListCard({
  item,
  styles,
}: {
  item: HealthListItem;
  styles: ReturnType<typeof useSubStyles>;
}) {
  const { colors } = useTheme();
  const { s } = useI18n();

  const confirmDelete = () => {
    if (!item.onDelete) return;
    appAlert(s.common.deleteQuestion, item.deleteLabel ?? item.title, [
      { text: s.common.cancel, style: "cancel" },
      { text: s.common.delete, style: "destructive", onPress: item.onDelete },
    ]);
  };

  const goEdit = item.onEdit ?? item.onPress;

  const body = (
    <Card style={styles.row}>
      <Pressable style={styles.rowMain} onPress={goEdit} disabled={!goEdit}>
        {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.rowSub} numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}
          {item.details?.map((line) => (
            <Text key={line} style={styles.rowDetail} numberOfLines={2}>
              {line}
            </Text>
          ))}
          {item.meta ? <Text style={styles.rowMeta}>{item.meta}</Text> : null}
        </View>
      </Pressable>
      {item.onDelete ? (
        <Pressable style={styles.actionBtn} onPress={confirmDelete} accessibilityLabel="Xóa">
          <Trash2 color={colors.emergency} size={16} />
        </Pressable>
      ) : null}
    </Card>
  );

  return body;
}

export function HealthActionTile({
  icon: Icon,
  label,
  desc,
  tintKey,
  colorKey,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  tintKey: "tintBlue" | "tintGreen" | "tintPurple" | "tintOrange";
  colorKey: "brand" | "success" | "pink" | "warning";
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useSubStyles();
  return (
    <Pressable style={styles.actionTile} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: colors[tintKey] }]}>
        <Icon color={colors[colorKey]} size={22} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
      <ChevronRight color={colors.muted} size={16} />
    </Pressable>
  );
}

function useSubStyles() {
  return useThemedStyles((c, fontScale) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      marginBottom: 8,
      padding: 10,
      paddingRight: 8,
      ...cardShadow(c),
    },
    rowMain: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      minWidth: 0,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    emoji: { fontSize: 24, width: 36, textAlign: "center" as const },
    rowTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    rowSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
    rowDetail: { fontSize: 12 * fontScale, color: c.muted, marginTop: 3, lineHeight: 17 },
    rowMeta: { fontSize: 11 * fontScale, color: c.brand, fontWeight: "600" as const, marginTop: 4 },
    actionTile: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      padding: 14,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: 10,
      ...cardShadow(c),
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    actionLabel: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    actionDesc: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2, lineHeight: 17 },
  }));
}
