import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader } from "@mobile/components/ui";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

const FEATURE_COPY: Record<string, { title: string; description: string }> = {
  "dat-xe-gia-dinh": {
    title: "Đặt xe gia đình",
    description:
      "Đặt xe đưa đón gia đình trong tòa nhà đang được triển khai. Hiện bạn có thể gửi yêu cầu qua mục Dịch vụ & Tiện ích.",
  },
  "mua-sam-ho": {
    title: "Mua sắm hộ",
    description:
      "Đặt hàng mua sắm hộ cho gia đình sẽ ra mắt sớm trên app native. Tạm thời dùng phiên bản web hoặc liên hệ lễ tân.",
  },
  "goi-uu-dai": {
    title: "Gói dịch vụ ưu đãi",
    description:
      "Gói combo dịch vụ ưu đãi cho cư dân sẽ ra mắt sớm. Theo dõi thông báo từ Ban quản lý để biết khi kích hoạt.",
  },
  "moi-thanh-vien": {
    title: "Mời thành viên",
    description:
      "Gửi lời mời tham gia hộ gia đình qua email hoặc link. Tạm thời dùng Cổng gia đình trên web (mục Thành viên → Mời thành viên).",
  },
};

export default function ComingSoonScreen() {
  const { feature, back } = useLocalSearchParams<{ feature?: string; back?: string }>();
  const styles = useComingSoonStyles();
  const copy = feature ? FEATURE_COPY[feature] : undefined;
  const title = copy?.title ?? "Đang phát triển";
  const backHref = back ?? "/(tabs)/gia-dinh";

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={title} back={backHref} />
      <Card style={styles.card}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.heading}>Đang phát triển</Text>
        <Text style={styles.sub}>
          {copy?.description ??
            "Tính năng này đang được port sang app React Native. Vui lòng quay lại sau."}
        </Text>
      </Card>
    </Screen>
  );
}

function useComingSoonStyles() {
  return useThemedStyles((c, fontScale) => ({
    card: { alignItems: "center" as const, paddingVertical: 32, gap: 8 },
    emoji: { fontSize: 40 },
    heading: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground, textAlign: "center" as const },
    sub: { fontSize: 14 * fontScale, color: c.muted, textAlign: "center" as const, lineHeight: 20 },
  }));
}
