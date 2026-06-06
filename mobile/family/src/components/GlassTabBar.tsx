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
  TAB_BAR_SHELL_PADDING_TOP,
} from "@mobile/theme/tabBar";

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const bottomPad = Math.max(insets.bottom, TAB_BAR_FLOAT_MARGIN) + TAB_BAR_BOTTOM_OFFSET;

  const overlay = isDark ? "rgba(30, 30, 30, 0.5)" : "rgba(255, 255, 255, 0.5)";
  const androidSolid = isDark ? "rgba(30, 30, 30, 0.9)" : "rgba(255, 255, 255, 0.94)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.08)";

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View
        style={[
          styles.shell,
          {
            borderColor,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 10,
              },
              android: { elevation: 12 },
            }),
          },
        ]}
      >
        <View style={styles.blurClip}>
          <BlurView
            intensity={isDark ? 64 : 80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: Platform.OS === "ios" ? overlay : androidSolid },
            ]}
          />
        </View>

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
                        { borderColor: colors.card },
                        isFocused && styles.featuredBtnActive,
                      ]}
                    >
                      {icon}
                    </LinearGradient>
                  ) : (
                    <View style={styles.iconWrap}>{icon}</View>
                  )}
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
  },
  shell: {
    height: TAB_BAR_CONTENT_HEIGHT + TAB_BAR_SHELL_PADDING_TOP,
    paddingTop: TAB_BAR_SHELL_PADDING_TOP,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "visible",
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
    gap: 2,
    paddingBottom: 4,
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  featuredBtnActive: {
    transform: [{ scale: 1.06 }],
  },
  label: {
    fontSize: 9,
    maxWidth: 64,
    textAlign: "center",
  },
});
