import { useRouter } from "expo-router";
import { Bell, Moon, Sun } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";

type Props = {
  unread?: number;
  showBell?: boolean;
};

function iconBtnStyle(colors: { card: string; cardBorder: string }) {
  return StyleSheet.flatten([
    styles.iconBtn,
    { backgroundColor: colors.card, borderColor: colors.cardBorder },
  ]);
}

export function GuardHeaderActions({ unread = 0, showBell = true }: Props) {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        style={iconBtnStyle(colors)}
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
        <Pressable
          style={iconBtnStyle(colors)}
          onPress={() => router.push("/(tabs)/notifications")}
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
        >
          <Bell color={colors.foreground} size={18} />
          {unread > 0 ? (
            <View style={StyleSheet.flatten([styles.badge, { backgroundColor: colors.emergency }])}>
              <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
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
