import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";

const MONTHS_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function MonthPickerModal({
  visible,
  year,
  month,
  onClose,
  onSelect,
}: {
  visible: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
}) {
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const ex = s.expense.dashboard;
  const [viewYear, setViewYear] = React.useState(year);
  const styles = usePickerStyles();
  const months = locale === "en" ? MONTHS_EN : MONTHS_VI;

  React.useEffect(() => {
    if (visible) setViewYear(year);
  }, [visible, year]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{ex.pickMonth}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.yearNav}>
          <Pressable onPress={() => setViewYear((y) => y - 1)} hitSlop={10}>
            <ChevronLeft size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.yearText}>{viewYear}</Text>
          <Pressable onPress={() => setViewYear((y) => y + 1)} hitSlop={10}>
            <ChevronRight size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {months.map((label, i) => {
            const selected = viewYear === year && i === month;
            const isNow =
              viewYear === new Date().getFullYear() && i === new Date().getMonth();
            return (
              <Pressable
                key={label}
                style={[
                  styles.cell,
                  selected && { backgroundColor: colors.brand },
                  !selected && isNow && { borderColor: colors.brand, borderWidth: 1 },
                ]}
                onPress={() => {
                  onSelect(viewYear, i);
                  onClose();
                }}
              >
                <Text style={[styles.cellText, selected && { color: colors.white }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function usePickerStyles() {
  return useThemedStyles((c, fontScale) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      position: "absolute" as const,
      left: 16,
      right: 16,
      top: "22%" as const,
      backgroundColor: c.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 16,
    },
    sheetHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 12,
    },
    sheetTitle: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground },
    yearNav: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 20,
      marginBottom: 14,
    },
    yearText: { fontSize: 18 * fontScale, fontWeight: "800" as const, color: c.foreground },
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
    cell: {
      width: "30%" as const,
      paddingVertical: 12,
      borderRadius: radius.lg,
      backgroundColor: c.mutedBg,
      alignItems: "center" as const,
    },
    cellText: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.foreground },
  }));
}
