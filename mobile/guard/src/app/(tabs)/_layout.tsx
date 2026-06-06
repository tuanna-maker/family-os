import { Tabs } from "expo-router";
import { Home, CalendarDays, Bell, User } from "lucide-react-native";
import { GuardTabBar } from "@mobile/components/GuardTabBar";
import { useTheme } from "@mobile/theme/themeStore";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <GuardTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size, focused }) => (
            <Home color={color} size={size ?? 22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Lịch trực",
          tabBarIcon: ({ color, size, focused }) => (
            <CalendarDays color={color} size={size ?? 22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Thông báo",
          tabBarIcon: ({ color, size, focused }) => (
            <Bell color={color} size={size ?? 22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size, focused }) => (
            <User color={color} size={size ?? 22} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
