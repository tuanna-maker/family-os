import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { colors, radius } from "@mobile/theme/colors";
import { useAuth } from "@mobile/hooks/useAuth";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { getMyContext } from "@shared/supabase/auth";

export default function TaiKhoanScreen() {
  const { signOut, user } = useAuth();
  const { profile, family } = useFamilyContext();
  const router = useRouter();
  const { theme, setTheme } = useAppPrefs();

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
    { icon: Car, label: "Đặt xe gia đình", onPress: () => router.push("/dat-xe") },
    { icon: Crown, label: "Gói ưu đãi", onPress: () => router.push("/goi-uu-dai") },
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
      <PageHeader title="Tài khoản" />
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

const styles = StyleSheet.create({
  card: { gap: 8, marginBottom: 16 },
  name: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  email: { fontSize: 14, color: colors.muted },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  label: { color: colors.muted },
  value: { color: colors.foreground, fontWeight: "600" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  menuLabel: { flex: 1, fontWeight: "600", color: colors.foreground },
  menuValue: { fontSize: 12, color: colors.muted, fontWeight: "700" },
});
