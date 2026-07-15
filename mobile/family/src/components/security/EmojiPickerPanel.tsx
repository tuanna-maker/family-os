import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { AppColors } from "@mobile/theme/palettes";

export const CHAT_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗",
  "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝",
  "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐",
  "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥",
  "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
  "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯",
  "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟",
  "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦",
  "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖",
  "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡",
  "😠", "🤬", "👍", "👎", "👏", "🙏", "🤝", "👋",
  "💪", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤",
  "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
  "🔥", "✨", "⭐", "🌟", "💯", "✅", "❌", "⚠️",
  "🆘", "🏠", "🚗", "📦", "📷", "🎉", "🎊", "🌙",
];

type Props = {
  colors: AppColors;
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPickerPanel({ colors, onPick, onClose }: Props) {
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.muted }]}>Biểu tượng</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={[styles.close, { color: colors.brand }]}>Đóng</Text>
        </Pressable>
      </View>
      <FlatList
        data={CHAT_EMOJIS}
        keyExtractor={(item, i) => `${item}-${i}`}
        numColumns={8}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Pressable style={styles.cell} onPress={() => onPick(item)}>
            <Text style={styles.emoji}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 220,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  title: { fontSize: 12, fontWeight: "600" },
  close: { fontSize: 13, fontWeight: "600" },
  grid: { paddingHorizontal: 6, paddingBottom: 8 },
  cell: {
    flex: 1,
    maxWidth: "12.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 26 },
});
