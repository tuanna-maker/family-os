import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Bell,
  Car,
  Crown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Moon,
  Phone,
  QrCode,
  Settings,
  Wrench,
} from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { useAuth } from "@mobile/hooks/useAuth";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { getMyContext } from "@shared/supabase/auth";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export default function TaiKhoanScreen() {
  const { signOut, user } = useAuth();
  const { profile, family } = useFamilyContext();
  const router = useRouter();
  const { theme, setTheme } = useAppPrefs();
  const { colors } = useTheme();
  const styles = useAccountStyles();

  const ctxQ = useQuery({ queryKey: ["my-context"], queryFn: () => getMyContext() });

  const menu: Array<{
    icon: typeof Bell;
    label: string;
    onPress: () => void;
    value?: string;
  }> = [
    { icon: LayoutDashboard, label: "Cổng gia đình", onPress: () => router.push("/portal") },
    { icon: Bell, label: "Hộp thư thông báo", onPress: () => router.push("/thong-bao") },
    { icon: Settings, label: "Cài đặt thông báo", onPress: () => router.push("/cai-dat/thong-bao") },
    { icon: Phone, label: "Người liên hệ khẩn cấp", onPress: () => router.push("/lien-he") },
    { icon: QrCode, label: "QR ra vào khách", onPress: () => router.push("/qr-vao-ra") },
    { icon: Wrench, label: "Dịch vụ & tiện ích", onPress: () => router.push("/dich-vu") },
    {
      icon: Car,
      label: "Đặt xe gia đình",
      onPress: () => router.push({ pathname: "/coming-soon", params: { feature: "dat-xe-gia-dinh", back: "/(tabs)/tai-khoan" } }),
    },
    {
      icon: Crown,
      label: "Gói ưu đãi",
      onPress: () => router.push({ pathname: "/coming-soon", params: { feature: "goi-uu-dai", back: "/(tabs)/tai-khoan" } }),
    },
    {
      icon: Moon,
      label: "Giao diện tối",
      onPress: () => setTheme(theme === "dark" ? "light" : "dark"),
      value: theme === "dark" ? "Bật" : "Tắt",
    },
    { icon: HelpCircle, label: "Hỗ trợ", onPress: () => {} },
    { icon: LogOut, label: "Đăng xuất", onPress: () => signOut() },
  ];

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Tài khoản" showBack={false} />
      <Card style={styles.card}>
        <Text style={styles.name}>{profile?.full_name ?? "Thành viên"}</Text>
        <Text style={styles.email}>{user?.email ?? ctxQ.data?.email ?? ""}</Text>
        {family ? (
          <View style={styles.row}>
            <Text style={styles.label}>Gia đình</Text>
            <Text style={styles.value}>{family.name}</Text>
          </View>
        ) : null}
        {family?.apartment ? (
          <View style={styles.row}>
            <Text style={styles.label}>Căn hộ</Text>
            <Text style={styles.value}>{family.apartment}</Text>
          </View>
        ) : null}
      </Card>

      {menu.map((item) => (
        <Pressable key={item.label} style={styles.menuItem} onPress={item.onPress}>
          <item.icon color={colors.brand} size={20} />
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
        </Pressable>
      ))}
      <View style={{ height: 24 }} />
    </Screen>
  );
}

function useAccountStyles() {
  return useThemedStyles((c, fontScale) => ({
    card: { gap: 8, marginBottom: 16 },
    name: { fontSize: 22 * fontScale, fontWeight: "800" as const, color: c.foreground },
    email: { fontSize: 14 * fontScale, color: c.muted },
    row: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 8 },
    label: { color: c.muted, fontSize: 14 * fontScale },
    value: { color: c.foreground, fontWeight: "600" as const, fontSize: 14 * fontScale },
    menuItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      padding: 14,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 8,
    },
    menuLabel: { flex: 1, fontWeight: "600" as const, color: c.foreground, fontSize: 15 * fontScale },
    menuValue: { fontSize: 12 * fontScale, color: c.muted, fontWeight: "700" as const },
  }));
}
