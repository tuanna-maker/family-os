import { View, Text } from "react-native";
import Svg, { G, Circle } from "react-native-svg";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

type Slice = { label: string; value: number; color: string; pct: number };

export function ExpenseDonutChart({
  slices,
  centerLabel,
  size = 120,
}: {
  slices: Slice[];
  centerLabel: string;
  size?: number;
}) {
  const { colors } = useTheme();
  const styles = useDonutStyles(size);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          <Circle cx={cx} cy={cy} r={r} stroke={colors.mutedBg} strokeWidth={stroke} fill="none" />
          {slices.map((s, i) => {
            const dash = (s.pct / 100) * circ;
            const el = (
              <Circle
                key={`${s.label}-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerText}>{centerLabel}</Text>
      </View>
    </View>
  );
}

function useDonutStyles(size: number) {
  return useThemedStyles((c, fontScale) => ({
    wrap: { width: size, height: size, alignItems: "center" as const, justifyContent: "center" as const },
    center: {
      position: "absolute" as const,
      width: size * 0.55,
      height: size * 0.55,
      borderRadius: radius.pill,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    centerText: {
      fontSize: 10 * fontScale,
      fontWeight: "700" as const,
      color: c.muted,
      textAlign: "center" as const,
      lineHeight: 13,
    },
  }));
}
