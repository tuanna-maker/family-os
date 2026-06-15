import { FlatList, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { CHAT_EMOJIS } from "@mobile/constants/chat-emojis";

const COLS = 8;

type Props = {
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPickerPanel({ onPick, onClose }: Props) {
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((width - 16) / COLS);

  return (
    <View className="h-[220px] border-t border-border bg-card">
      <View className="flex-row items-center justify-between px-3.5 py-2">
        <Text className="text-xs font-semibold text-muted-foreground">Biểu tượng</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-brand">Đóng</Text>
        </Pressable>
      </View>
      <FlatList
        data={CHAT_EMOJIS}
        keyExtractor={(item, i) => `${item}-${i}`}
        numColumns={COLS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item)}
            style={{
              width: cellSize,
              height: cellSize,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 26,
                lineHeight: 30,
                textAlign: "center",
                ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
              }}
              allowFontScaling={false}
            >
              {item}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
