import { Link } from "expo-router";
import { Bell, Moon, Sun } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useGuardPrefs } from "@mobile/hooks/useGuardPrefs";

type Props = {
  unread?: number;
  showBell?: boolean;
};

export function GuardHeaderActions({ unread = 0, showBell = true }: Props) {
  const { colors, theme, toggleTheme } = useTheme();
  const { notificationsEnabled } = useGuardPrefs();

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={toggleTheme}
        accessibilityRole="button"
        accessibilityLabel={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      >
        {theme === "dark" ? (
          <Sun color={colors.foreground} size={18} />
        ) : (
          <Moon color={colors.foreground} size={18} />
        )}
      </Pressable>

      {showBell ? (
        <Link href="/(tabs)/notifications" asChild>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
          >
            <Bell color={colors.foreground} size={18} />
            {notificationsEnabled && unread > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.emergency }]}>
                <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
});
