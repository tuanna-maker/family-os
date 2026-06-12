import { Text, View } from "react-native";
import { ChatAudioBubble } from "@mobile/components/ChatAudioBubble";
import { ChatImageMessage } from "@mobile/components/ChatImageMessage";
import type { SecurityChatMessage } from "@guard/api/security-chat";
import { formatNotifTime } from "@mobile/utils/guardFormat";

export function SecurityChatBubble({
  item,
  residentLabel = "Cư dân",
}: {
  item: SecurityChatMessage;
  residentLabel?: string;
}) {
  const mine = item.sender_role === "guard";
  const system = item.sender_role === "system";
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
          <View className={`mb-3 w-full ${mine ? "items-end" : "items-start"}`}>
            <View
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                mine ? "bg-brand rounded-br-md" : "bg-card border border-border rounded-bl-md"
              }`}
            >
              <Text className={`text-sm ${mine ? "text-white" : "text-foreground"}`}>
                {imageCaption}
              </Text>
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
          <View className={`mb-3 w-full ${mine ? "items-end" : "items-start"}`}>
            <View
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                mine ? "bg-brand rounded-br-md" : "bg-card border border-border rounded-bl-md"
              }`}
            >
              <Text className={`text-sm ${mine ? "text-white" : "text-foreground"}`}>
                {audioCaption}
              </Text>
            </View>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View className={`mb-3 w-full ${mine ? "items-end" : "items-start"}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          mine
            ? "bg-brand rounded-br-md"
            : system
              ? "bg-muted/50"
              : "bg-card border border-border rounded-bl-md"
        }`}
      >
        {!mine && !system ? (
          <Text className="text-[10px] font-semibold text-green-600 mb-0.5">{residentLabel}</Text>
        ) : null}
        {item.body ? (
          <Text className={`text-sm leading-5 ${mine ? "text-white" : "text-foreground"}`}>
            {item.body}
          </Text>
        ) : null}
        <Text
          className={`text-[10px] mt-1 opacity-70 ${mine ? "text-white text-right" : "text-muted-foreground"}`}
        >
          {formatNotifTime(item.created_at)}
        </Text>
      </View>
    </View>
  );
}
