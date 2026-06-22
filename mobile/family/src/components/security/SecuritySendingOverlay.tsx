import { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";

const MIN_DURATION_MS = 900;

type Props = {
  visible: boolean;
  label: string;
};

export function SecuritySendingOverlay({ visible, label }: Props) {
  const { colors, theme } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const isDark = theme === "dark";

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: MIN_DURATION_MS,
      useNativeDriver: false,
    }).start();
  }, [visible, progress]);

  if (!visible) return null;

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const knobLeft = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const trackBorder = isDark ? "rgba(251, 191, 36, 0.45)" : "rgba(245, 158, 11, 0.55)";
  const trackBg = isDark ? "rgba(251, 191, 36, 0.12)" : "rgba(254, 243, 199, 0.85)";
  const fillBg = isDark ? "rgba(251, 191, 36, 0.55)" : "rgba(253, 224, 71, 0.75)";
  const accent = isDark ? "#FBBF24" : "#D97706";
  const scrim = isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 251, 235, 0.92)";

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={[styles.scrim, { backgroundColor: scrim }]}>
        <View style={styles.center}>
          <View style={[styles.track, { borderColor: trackBorder, backgroundColor: trackBg }]}>
            <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: fillBg }]} />
            <Animated.View
              style={[
                styles.knob,
                {
                  left: knobLeft,
                  backgroundColor: isDark ? "#1E293B" : "#FFFBEB",
                  borderColor: trackBorder,
                },
              ]}
            >
              <View style={[styles.knobInner, { backgroundColor: accent }]} />
            </Animated.View>
          </View>
          <Text style={[styles.label, { color: accent }]}>{label}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  center: {
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
  },
  track: {
    width: "100%",
    height: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  knob: {
    position: "absolute",
    top: -5,
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  knobInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
