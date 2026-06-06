import { Pressable, Text, View } from "react-native";
import { FieldLabel } from "@mobile/components/ui";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

const CHILD_EMOJIS = ["🧒", "👧", "👦", "🍼", "🎒", "⚽", "🎨", "📚", "🌟"] as const;

export function EmojiPicker({
  label = "Emoji / biểu tượng",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (emoji: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c, fontScale) => ({
    preview: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      marginBottom: 12,
      padding: 12,
      borderRadius: radius.lg,
      backgroundColor: c.mutedBg,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    previewEmoji: { fontSize: 36 },
    previewHint: { fontSize: 13 * fontScale, color: c.muted, flex: 1 },
    row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
    chip: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    chipActive: { backgroundColor: c.tintBlue, borderColor: c.brand },
    chipText: { fontSize: 22 },
  }));

  const selected = value.trim() || "🧒";

  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.preview}>
        <Text style={styles.previewEmoji}>{selected}</Text>
        <Text style={styles.previewHint}>Chọn emoji hiển thị trên hồ sơ con</Text>
      </View>
      <View style={styles.row}>
        {CHILD_EMOJIS.map((e) => (
          <Pressable
            key={e}
            onPress={() => onChange(e)}
            style={[styles.chip, selected === e && styles.chipActive]}
            accessibilityLabel={`Chọn ${e}`}
          >
            <Text style={styles.chipText}>{e}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
