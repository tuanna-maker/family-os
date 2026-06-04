import type { ReactElement } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import {
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_FEATURED_SIZE,
  TAB_BAR_FLOAT_MARGIN,
} from "@mobile/theme/tabBar";

/**
 * Thanh menu dưới kiểu Telegram / iOS:
 * - iOS: BlurView (UIBlurEffect) + lớp phủ rgba mỏng
 * - Android: nền alpha cao (fallback khi blur yếu)
 * Layout tham chiếu BottomNav web: viên thuốc nổi, tab Bảo an giữa nổi bật.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const bottomPad = Math.max(insets.bottom, TAB_BAR_FLOAT_MARGIN);

  const overlay = isDark ? "rgba(30, 30, 30, 0.5)" : "rgba(255, 255, 255, 0.5)";
  const androidSolid = isDark ? "rgba(30, 30, 30, 0.9)" : "rgba(255, 255, 255, 0.94)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.08)";

  return (
    <View
      style={[styles.outer, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.shell,
          {
            borderColor,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.35 : 0.12,
                shadowRadius: 16,
              },
              android: { elevation: 16 },
            }),
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={isDark ? 70 : 90}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <BlurView
            intensity={isDark ? 48 : 64}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: Platform.OS === "ios" ? overlay : androidSolid,
            },
          ]}
        />

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : options.title ?? route.name;
            const isFocused = state.index === index;
            const isFeatured = route.name === "bao-an";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const tint = isFeatured ? colors.emergency : isFocused ? colors.brand : colors.muted;
            const icon = options.tabBarIcon
              ? (options.tabBarIcon({
                  focused: isFocused,
                  color: isFeatured ? colors.white : tint,
                  size: isFeatured ? 22 : 20,
                }) as ReactElement)
              : null;

            if (isFeatured) {
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={label}
                  onPress={onPress}
                  style={styles.tabFeatured}
                >
                  <LinearGradient
                    colors={[colors.emergency, colors.pink]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.featuredBtn,
                      { borderColor: colors.card },
                      isFocused && styles.featuredBtnActive,
                    ]}
                  >
                    {icon}
                  </LinearGradient>
                  <Text style={[styles.label, { color: tint, fontWeight: "700" }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
                onPress={onPress}
                style={styles.tab}
              >
                <View
                  style={[
                    styles.iconWrap,
                    isFocused && { backgroundColor: colors.tintBlue, transform: [{ scale: 1.04 }] },
                  ]}
                >
                  {icon}
                </View>
                <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
  },
  shell: {
    height: TAB_BAR_CONTENT_HEIGHT,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    minHeight: TAB_BAR_CONTENT_HEIGHT - 8,
    paddingTop: 8,
  },
  tabFeatured: {
    flex: 1,
    alignItems: "center",
    marginTop: -(TAB_BAR_FEATURED_SIZE / 2 - 4),
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBtn: {
    width: TAB_BAR_FEATURED_SIZE,
    height: TAB_BAR_FEATURED_SIZE,
    borderRadius: TAB_BAR_FEATURED_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
  },
  featuredBtnActive: {
    transform: [{ scale: 1.08 }],
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    maxWidth: 72,
    textAlign: "center",
  },
});
