import { FlatList, Pressable, Text, View } from "react-native";
import { CHAT_EMOJIS } from "@mobile/constants/chat-emojis";

type Props = {
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPickerPanel({ onPick, onClose }: Props) {
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
        numColumns={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <Pressable
            className="flex-1 max-w-[12.5%] aspect-square items-center justify-center"
            onPress={() => onPick(item)}
          >
            <Text className="text-[26px]">{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
