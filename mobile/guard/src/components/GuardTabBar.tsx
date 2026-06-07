import type { ReactElement } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import {
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_FLOAT_MARGIN,
  TAB_BAR_ICON_SIZE,
  TAB_BAR_ICON_SLOT,
  TAB_BAR_SHELL_PADDING_TOP,
} from "@mobile/theme/tabBar";
import { useGuardNotifications } from "@mobile/hooks/useGuardNotifications";

const OUTER_HORIZONTAL = 12;

export function GuardTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors, theme } = useTheme();
  const { unread, notificationsEnabled } = useGuardNotifications();
  const isDark = theme === "dark";
  const bottomPad = Math.max(insets.bottom, TAB_BAR_FLOAT_MARGIN) + TAB_BAR_BOTTOM_OFFSET;

  const barWidth = screenWidth - OUTER_HORIZONTAL * 2;
  const tabCount = state.routes.length;
  const tabWidth = barWidth / tabCount;

  const overlay = isDark ? "rgba(30, 30, 30, 0.55)" : "rgba(255, 255, 255, 0.72)";
  const androidSolid = isDark ? "rgba(28, 28, 30, 0.96)" : "rgba(255, 255, 255, 0.98)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.1)";

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View
        style={[
          styles.shell,
          { width: barWidth, borderColor },
          Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 10,
            },
            android: { elevation: 12 },
          }),
        ]}
      >
        <View style={styles.blurClip} pointerEvents="none">
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={isDark ? 64 : 80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: Platform.OS === "ios" ? overlay : androidSolid },
            ]}
          />
        </View>

        <View style={[styles.row, { width: barWidth, height: TAB_BAR_CONTENT_HEIGHT }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : (options.title ?? route.name);
            const isFocused = state.index === index;
            const isNotifications = route.name === "notifications";
            const showBadge = isNotifications && notificationsEnabled && unread > 0;

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

            const tint = isFocused ? colors.brand : colors.muted;
            const icon = options.tabBarIcon
              ? (options.tabBarIcon({
                  focused: isFocused,
                  color: tint,
                  size: TAB_BAR_ICON_SIZE,
                }) as ReactElement)
              : null;

            return (
              <View
                key={route.key}
                style={[styles.tabSlot, { width: tabWidth }]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={label}
                  onPress={onPress}
                  android_ripple={{ color: "rgba(128,128,128,0.2)", borderless: false }}
                  style={styles.tabPress}
                >
                  <View style={styles.iconSlot}>
                    <View style={styles.iconWrap}>{icon}</View>
                    {showBadge ? (
                      <View style={[styles.badge, { backgroundColor: colors.emergency }]}>
                        <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.label,
                      { color: tint, fontWeight: isFocused ? "700" : "500", width: tabWidth - 4 },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {label}
                  </Text>
                </Pressable>
              </View>
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
    alignItems: "center",
    paddingHorizontal: OUTER_HORIZONTAL,
  },
  shell: {
    height: TAB_BAR_CONTENT_HEIGHT + TAB_BAR_SHELL_PADDING_TOP,
    paddingTop: TAB_BAR_SHELL_PADDING_TOP,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  blurClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  tabSlot: {
    height: TAB_BAR_CONTENT_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabPress: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 3,
  },
  iconSlot: {
    width: TAB_BAR_ICON_SLOT,
    height: TAB_BAR_ICON_SLOT,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: TAB_BAR_ICON_SLOT,
    height: TAB_BAR_ICON_SLOT,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -6,
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
  label: {
    fontSize: 9,
    lineHeight: 11,
    marginTop: 1,
    textAlign: "center",
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
});
