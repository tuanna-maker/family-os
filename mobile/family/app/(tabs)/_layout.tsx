import { View } from "react-native";
import { Tabs } from "expo-router";
import { Home, Users, ShieldCheck, Sparkles, User } from "lucide-react-native";
import { GlassTabBar } from "@mobile/components/GlassTabBar";
import { useTheme } from "@mobile/theme/themeStore";
import { useI18n } from "@mobile/i18n/useI18n";

function BaoAnTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  return (
    <ShieldCheck color={color} size={size} strokeWidth={focused ? 2.4 : 2.2} />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { s } = useI18n();

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
          title: s.tabs.home,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="gia-dinh"
        options={{
          title: s.tabs.family,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bao-an"
        options={{
          title: s.tabs.security,
          tabBarIcon: ({ color, size, focused }) => (
            <BaoAnTabIcon color={color} size={size ?? 20} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cong-dong"
        options={{
          title: s.tabs.community,
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tai-khoan"
        options={{
          title: s.tabs.account,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
