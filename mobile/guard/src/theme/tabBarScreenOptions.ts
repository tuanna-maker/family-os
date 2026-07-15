import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

export function transparentTabBarOptions(
  sceneBackground: string,
): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarShowLabel: false,
    sceneStyle: { backgroundColor: sceneBackground },
    tabBarBackground: () => null,
    tabBarItemStyle: { backgroundColor: "transparent" },
    tabBarStyle: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 0,
      minHeight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      backgroundColor: "transparent",
      borderTopWidth: 0,
      borderTopColor: "transparent",
      elevation: 0,
      shadowOpacity: 0,
    },
  };
}
