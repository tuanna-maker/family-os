import type { ReactElement } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLayoutInfo } from "@mobile/hooks/useLayoutInfo";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import {
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_FLOAT_MARGIN,
  TAB_BAR_ICON_SIZE,
  TAB_BAR_ICON_SLOT,
} from "@mobile/theme/tabBar";
import { tabBarGlassColors } from "@mobile/theme/tabBarGlass";
import { useGuardNotifications } from "@mobile/hooks/useGuardNotifications";

export function GuardTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { isLandscape, contentMaxWidth } = useLayoutInfo();
  const { badgeCount } = useGuardNotifications();
  const isDark = theme === "dark";
  const bottomPad = Math.max(insets.bottom, TAB_BAR_FLOAT_MARGIN) + TAB_BAR_BOTTOM_OFFSET;
  const { overlay, androidSolid, border: borderColor } = tabBarGlassColors(isDark);

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: bottomPad },
        isLandscape ? { alignItems: "center" as const } : null,
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.shell,
          {
            borderColor,
            backgroundColor: Platform.OS === "ios" ? "transparent" : androidSolid,
            maxWidth: isLandscape ? contentMaxWidth : undefined,
            width: "100%" as const,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 6,
              },
              android: { elevation: 0 },
            }),
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <View style={styles.blurClip} pointerEvents="none">
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlay }]} />
          </View>
        ) : null}

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : (options.title ?? route.name);
            const isFocused = state.index === index;
            const isNotifications = route.name === "notifications";
            const showBadge = isNotifications && badgeCount > 0;

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
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
                onPress={onPress}
                style={styles.tab}
              >
                <View style={styles.iconSlot}>
                  <View style={styles.iconWrap}>{icon}</View>
                  {showBadge ? (
                    <View style={[styles.badge, { backgroundColor: colors.emergency }]}>
                      <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: tint,
                      fontWeight: isFocused ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
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
  blurClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    right: -4,
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
      maxWidth: 56,
    textAlign: "center",
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
});
