import { View } from "react-native";
import { Tabs } from "expo-router";
import { Home, Users, ShieldCheck, Sparkles, User } from "lucide-react-native";
import { GlassTabBar } from "@mobile/components/GlassTabBar";
import { useTheme } from "@mobile/theme/themeStore";

function BaoAnTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  return (
    <ShieldCheck color={color} size={size} strokeWidth={focused ? 2.4 : 2.2} />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="gia-dinh"
        options={{
          title: "Gia đình",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bao-an"
        options={{
          title: "Bảo an",
          tabBarIcon: ({ color, size, focused }) => (
            <BaoAnTabIcon color={color} size={size ?? 20} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cong-dong"
        options={{
          title: "Cộng đồng",
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tai-khoan"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
