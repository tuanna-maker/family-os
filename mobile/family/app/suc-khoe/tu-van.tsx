import { Text, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { HealthActionTile, HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { Card } from "@mobile/components/ui";
import { toast } from "@mobile/utils/toast";
import { useI18n } from "@mobile/i18n/useI18n";
import { useMemo } from "react";

export default function TuVanBacSiScreen() {
  const { colors } = useTheme();
  const styles = useTuVanStyles();
  const { s } = useI18n();
  const sp = s.screens.health.subpage;

  const channels = useMemo(
    () => [
      { id: "chat", emoji: "💬", title: sp.consultChat, desc: sp.consultChatDesc, eta: sp.consultChatEta },
      { id: "video", emoji: "📹", title: sp.consultVideo, desc: sp.consultVideoDesc, eta: sp.consultVideoEta },
      { id: "hotline", emoji: "📞", title: sp.consultHotline, desc: sp.consultHotlineDesc, eta: "1900 xxxx" },
    ],
    [sp],
  );

  return (
    <HealthSubScreen title={sp.consultDoctor} subtitle={sp.consultSub}>
      <Card style={styles.banner}>
        <MessageCircle size={28} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{sp.remoteConsult}</Text>
          <Text style={styles.bannerSub}>{sp.remoteConsultDesc}</Text>
        </View>
      </Card>
      {channels.map((ch) => (
        <HealthActionTile
          key={ch.id}
          icon={MessageCircle}
          label={`${ch.emoji} ${ch.title}`}
          desc={`${ch.desc} · ${ch.eta}`}
          tintKey="tintGreen"
          colorKey="success"
          onPress={() => toast.success(sp.consultConnecting)}
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
