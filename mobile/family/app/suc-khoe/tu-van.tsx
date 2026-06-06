import { Text, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { HealthActionTile, HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { TU_VAN_CHANNELS } from "@mobile/components/health/healthVisuals";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { Card } from "@mobile/components/ui";
import { toast } from "@mobile/utils/toast";

export default function TuVanBacSiScreen() {
  const { colors } = useTheme();
  const styles = useTuVanStyles();

  return (
    <HealthSubScreen title="Tư vấn bác sĩ" subtitle="Kết nối bác sĩ STOS khi cần hỗ trợ sức khỏe">
      <Card style={styles.banner}>
        <MessageCircle size={28} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Tư vấn từ xa</Text>
          <Text style={styles.bannerSub}>
            Chọn kênh phù hợp. Dữ liệu sức khỏe gia đình sẽ được chia sẻ với bác sĩ khi bạn đồng ý.
          </Text>
        </View>
      </Card>
      {TU_VAN_CHANNELS.map((ch) => (
        <HealthActionTile
          key={ch.id}
          icon={MessageCircle}
          label={`${ch.emoji} ${ch.title}`}
          desc={`${ch.desc} · ${ch.eta}`}
          tintKey="tintGreen"
          colorKey="success"
          onPress={() => toast.success("Tính năng tư vấn đang kết nối hệ thống bác sĩ STOS")}
        />
      ))}
    </HealthSubScreen>
  );
}

function useTuVanStyles() {
  return useThemedStyles((c, fontScale) => ({
    banner: {
      flexDirection: "row" as const,
      gap: 12,
      marginBottom: 16,
      alignItems: "flex-start" as const,
    },
    bannerTitle: { fontSize: 15 * fontScale, fontWeight: "700" as const, color: c.foreground },
    bannerSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 4, lineHeight: 18 },
  }));
}
