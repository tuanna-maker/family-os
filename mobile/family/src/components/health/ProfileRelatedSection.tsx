import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import type { AppointmentRow, MedicineRow } from "@mobile/api/health";
import { Card } from "@mobile/components/ui";
import { formatApptShort } from "@mobile/components/health/healthVisuals";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export function ProfileRelatedSection({
  title,
  emptyText,
  addLabel,
  onAdd,
  meds,
  appts,
  onMedPress,
  onApptPress,
}: {
  title: string;
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  meds?: MedicineRow[];
  appts?: AppointmentRow[];
  onMedPress?: (m: MedicineRow) => void;
  onApptPress?: (a: AppointmentRow) => void;
}) {
  const { colors } = useTheme();
  const styles = useSectionStyles();
  const items = meds ?? appts ?? [];
  const isMeds = !!meds;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Plus color={colors.brand} size={14} />
          <Text style={styles.addText}>{addLabel}</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : isMeds ? (
        meds!.map((m) => (
          <Pressable key={m.id} onPress={() => onMedPress?.(m)}>
            <Card style={styles.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {m.medicine}
                </Text>
                <Text style={styles.rowSub}>
                  {m.time_of_day ? `Uống lúc ${m.time_of_day.slice(0, 5)}` : "Đang dùng"}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        appts!.map((a) => (
          <Pressable key={a.id} onPress={() => onApptPress?.(a)}>
            <Card style={styles.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {a.doctor ?? "Khám tổng quát"}
                </Text>
                <Text style={styles.rowSub}>{formatApptShort(a.scheduled_at)}</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

function useSectionStyles() {
  return useThemedStyles((c, fontScale) => ({
    wrap: { marginBottom: 18 },
    head: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 10,
    },
    title: { fontSize: 15 * fontScale, fontWeight: "800" as const, color: c.foreground },
    addBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
    addText: { fontSize: 12 * fontScale, fontWeight: "700" as const, color: c.brand },
    empty: { fontSize: 13 * fontScale, color: c.muted, fontStyle: "italic" as const, marginBottom: 4 },
    row: { padding: 12, marginBottom: 8 },
    rowTitle: { fontSize: 14 * fontScale, fontWeight: "700" as const, color: c.foreground },
    rowSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 3 },
  }));
}
