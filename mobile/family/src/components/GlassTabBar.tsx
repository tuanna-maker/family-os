import type { ReactElement } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import {
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_FEATURED_SIZE,
  TAB_BAR_FLOAT_MARGIN,
  TAB_BAR_ICON_SLOT,
} from "@mobile/theme/tabBar";
import { tabBarGlassColors } from "@mobile/theme/tabBarGlass";
import { useUnreadNotifications } from "@mobile/hooks/useUnreadNotifications";

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { unread } = useUnreadNotifications();
  const isDark = theme === "dark";
  const bottomPad = Math.max(insets.bottom, TAB_BAR_FLOAT_MARGIN) + TAB_BAR_BOTTOM_OFFSET;
  const glass = tabBarGlassColors(isDark);
  const { overlay, androidSolid, border: borderColor } = glass;

  return (
    <View
      style={[styles.outer, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
      collapsable={false}
    >
      <View
        style={[
          styles.shell,
          {
            borderColor,
            backgroundColor: Platform.OS === "ios" ? "transparent" : androidSolid,
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
            const isFeatured = route.name === "bao-an";
            const isAccount = route.name === "tai-khoan";
            const showBadge = isAccount && unread > 0;

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
            const iconSize = isFeatured ? 20 : 18;
            const icon = options.tabBarIcon
              ? (options.tabBarIcon({
                  focused: isFocused,
                  color: isFeatured ? colors.white : tint,
                  size: iconSize,
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
                <View style={[styles.iconSlot, isFeatured && styles.featuredIconSlot]}>
                  {isFeatured ? (
                    <LinearGradient
                      colors={[colors.emergency, colors.pink]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.featuredBtn,
                        {
                          borderColor: isDark
                            ? colors.cardBorder
                            : "rgba(255, 255, 255, 0.55)",
                        },
                        isFocused && styles.featuredBtnActive,
                      ]}
                    >
                      {icon}
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconWrap}>{icon}</View>
                  )}
                  {showBadge ? (
                    <View style={[styles.badge, { backgroundColor: colors.emergency }]}>
                      <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: tint,
                      fontWeight: isFeatured || isFocused ? "700" : "500",
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
    backgroundColor: "transparent",
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
    backgroundColor: "transparent",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconSlot: {
    width: TAB_BAR_ICON_SLOT,
    height: TAB_BAR_ICON_SLOT,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredIconSlot: {
    height: TAB_BAR_FEATURED_SIZE,
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
  featuredBtn: {
    width: TAB_BAR_FEATURED_SIZE,
    height: TAB_BAR_FEATURED_SIZE,
    borderRadius: TAB_BAR_FEATURED_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  featuredBtnActive: {
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontSize: 9,
    lineHeight: 11,
    marginTop: 1,
    maxWidth: 64,
    textAlign: "center",
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
});
