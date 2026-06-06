import { Text } from "react-native";
import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

export default function HoatDongScreen() {
  const styles = useHintStyles();
  const { isLoading, activity, usingPilot } = useHealthOverview();

  return (
    <HealthSubScreen
      title="Hoạt động gần đây"
      subtitle="Nhắc thuốc, lịch khám và cập nhật sức khỏe"
      loading={isLoading}
      emptyTitle="Chưa có hoạt động"
      emptyDescription="Hoạt động sẽ hiện khi có nhắc thuốc hoặc lịch khám."
      items={activity.map((a, i) => ({
        id: `act-${i}`,
        emoji: a.emoji,
        title: a.text,
        meta: a.time,
      }))}
      footer={usingPilot ? <Text style={styles.hint}>Dữ liệu mẫu — thêm hồ sơ thật trong Quản lý sức khỏe</Text> : null}
    />
  );
}

function useHintStyles() {
  return useThemedStyles((c, fontScale) => ({
    hint: {
      fontSize: 11 * fontScale,
      color: c.muted,
      textAlign: "center" as const,
      marginTop: 8,
      fontStyle: "italic" as const,
    },
  }));
}
