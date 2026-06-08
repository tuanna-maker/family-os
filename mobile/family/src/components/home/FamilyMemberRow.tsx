import { Image, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { FamilyTodayMember } from "@mobile/api/family-today";
import { localeTag } from "@mobile/i18n/format";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { colorFromKey, getKindMeta, statusToneStyle } from "./homeVisuals";

export function FamilyMemberRow({ member }: { member: FamilyTodayMember }) {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const meta = getKindMeta(locale)[member.kind];
  const tone = statusToneStyle(colors, member.tone);
  const styles = useThemedStyles((c, fontScale) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      borderRadius: radius.lg,
      backgroundColor: c.mutedBg,
      padding: 10,
      marginBottom: 8,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: { fontWeight: "800" as const, fontSize: 16 * fontScale },
    dot: {
      position: "absolute" as const,
      bottom: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: c.card,
    },
    name: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground, flexShrink: 1 },
    role: { fontSize: 12 * fontScale, color: c.muted, fontWeight: "500" as const },
    chip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 3,
      marginTop: 4,
      alignSelf: "flex-start" as const,
    },
    chipText: { fontSize: 12 * fontScale, fontWeight: "600" as const },
    detail: { fontSize: 12 * fontScale, color: c.muted, flex: 1 },
    due: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.muted },
  }));

  const initials = member.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  const dueLabel = member.due_at
    ? new Date(member.due_at).toLocaleTimeString(localeTag(locale), { hour: "2-digit", minute: "2-digit" })
    : null;
  const MetaIcon = meta.Icon;

  return (
    <View style={styles.row}>
      <View>
        {member.avatar ? (
          <Image source={{ uri: member.avatar }} style={[styles.avatar, { overflow: "hidden" }]} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colorFromKey(colors, meta.bgKey) }]}>
            {initials ? (
              <Text style={[styles.avatarText, { color: colorFromKey(colors, meta.colorKey) }]}>{initials}</Text>
            ) : (
              <MetaIcon color={colorFromKey(colors, meta.colorKey)} size={20} />
            )}
          </View>
        )}
        <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <Text style={styles.name} numberOfLines={1}>
            {member.name}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            · {member.role ?? meta.label}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <View style={[styles.chip, { backgroundColor: tone.chip }]}>
            <MetaIcon color={tone.text} size={12} />
            <Text style={[styles.chipText, { color: tone.text }]}>{member.status}</Text>
          </View>
          {member.detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {member.detail}
            </Text>
          ) : null}
        </View>
      </View>
      {dueLabel ? <Text style={styles.due}>{dueLabel}</Text> : null}
      <ChevronRight color={colors.muted} size={14} />
    </View>
  );
}
