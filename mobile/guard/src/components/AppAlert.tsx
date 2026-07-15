import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { radius } from "@mobile/theme/colors";

export type AlertButtonStyle = "default" | "cancel" | "destructive";

export type AlertButton = {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
};

export type AlertPayload = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

type AlertContextValue = {
  show: (payload: AlertPayload) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

let externalShow: ((payload: AlertPayload) => void) | null = null;

export function showAppAlert(payload: AlertPayload) {
  externalShow?.(payload);
}

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<AlertPayload | null>(null);
  const { colors } = useTheme();

  const dismiss = useCallback(() => {
    setVisible(false);
    setPayload(null);
  }, []);

  const show = useCallback((next: AlertPayload) => {
    setPayload(next);
    setVisible(true);
  }, []);

  useEffect(() => {
    externalShow = show;
    return () => {
      externalShow = null;
    };
  }, [show]);

  const buttons =
    payload?.buttons && payload.buttons.length > 0
      ? payload.buttons
      : [{ text: "OK", style: "default" as const }];

  const onButtonPress = (btn: AlertButton) => {
    dismiss();
    btn.onPress?.();
  };

  return (
    <AlertContext.Provider value={{ show }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.title, { color: colors.foreground }]}>{payload?.title}</Text>
            {payload?.message ? (
              <Text style={[styles.message, { color: colors.muted }]}>{payload.message}</Text>
            ) : null}

            <View style={[styles.btnArea, { borderTopColor: colors.cardBorder }]}>
              {buttons.length === 1 ? (
                <Pressable style={styles.singleBtn} onPress={() => onButtonPress(buttons[0])}>
                  <Text style={[styles.btnText, { color: colors.brand }]}>{buttons[0].text}</Text>
                </Pressable>
              ) : (
                <View style={styles.btnRow}>
                  {buttons.map((btn, i) => (
                    <Pressable
                      key={`${btn.text}-${i}`}
                      style={[styles.btnCell, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.cardBorder }]}
                      onPress={() => onButtonPress(btn)}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          btn.style === "destructive" && { color: colors.emergency },
                          btn.style === "cancel" && { color: colors.muted, fontWeight: "500" },
                          (!btn.style || btn.style === "default") && { color: colors.brand },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAppAlert requires AppAlertProvider");
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 18,
  },
  btnArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  singleBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  btnRow: {
    flexDirection: "row",
  },
  btnCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
