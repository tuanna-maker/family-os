import { Text, View } from "react-native";
import { ChatAudioBubble } from "@mobile/components/security/ChatAudioBubble";
import { ChatImageMessage } from "@mobile/components/security/ChatImageMessage";
import { radius } from "@mobile/theme/colors";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import type { SecurityChatMessage } from "@mobile/lib/security-chat";
import { formatTime } from "@mobile/i18n/format";

type Props = {
  item: SecurityChatMessage;
  mine: boolean;
  locale: string;
  guardLabel?: string;
};

export function SecurityChatBubble({ item, mine, locale, guardLabel }: Props) {
  const styles = useThemedStyles((c) => ({
    bubbleWrap: { marginBottom: 10, alignItems: "flex-start" as const, width: "100%" as const },
    bubbleWrapMine: { alignItems: "flex-end" as const },
    bubble: {
      maxWidth: "85%",
      backgroundColor: c.card,
      borderRadius: radius.lg,
      padding: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    bubbleMine: { backgroundColor: c.brandDeep, borderColor: c.brandDeep },
    bubbleSystem: { backgroundColor: c.mutedBg, borderColor: c.mutedBg },
    guardLabel: { fontSize: 10, fontWeight: "600" as const, color: c.success, marginBottom: 2 },
    body: { color: c.foreground, fontSize: 15, lineHeight: 20 },
    bodyMine: { color: "#fff" },
    caption: { color: c.foreground, fontSize: 13, marginTop: 6 },
    time: { fontSize: 10, color: c.muted, marginTop: 6, alignSelf: "flex-end" as const },
    timeMine: { color: "rgba(255,255,255,0.75)" },
  }));

  const system = item.sender_role === "system";
  const guard = item.sender_role === "guard";
  const type = item.message_type ?? "text";
  const imageCaption =
    item.body && item.body !== "Ảnh" && item.body.trim() ? item.body.trim() : null;
  const audioCaption =
    item.body && item.body !== "Ghi âm" && item.body.trim() ? item.body.trim() : null;

  if (type === "image" && item.media_url) {
    return (
      <>
        <ChatImageMessage uri={item.media_url} mine={mine} />
        {imageCaption ? (
          <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
            <View style={[styles.bubble, mine && styles.bubbleMine]}>
              <Text style={[styles.body, mine && styles.bodyMine]}>{imageCaption}</Text>
            </View>
          </View>
        ) : null}
      </>
    );
  }

  if (type === "audio" && item.media_url) {
    return (
      <>
        <ChatAudioBubble uri={item.media_url} durationMs={item.media_duration_ms} mine={mine} />
        {audioCaption ? (
          <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
            <View style={[styles.bubble, mine && styles.bubbleMine]}>
              <Text style={[styles.body, mine && styles.bodyMine]}>{audioCaption}</Text>
            </View>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
      <View style={[styles.bubble, mine && styles.bubbleMine, system && styles.bubbleSystem]}>
        {guard ? <Text style={styles.guardLabel}>{guardLabel ?? "Đội bảo an"}</Text> : null}
        {item.body ? <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text> : null}
        <Text style={[styles.time, mine && styles.timeMine]}>
          {formatTime(item.created_at, locale)}
        </Text>
      </View>
    </View>
  );
}
