import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { getLocaleRef } from "@mobile/i18n/localeRef";
import { getStrings } from "@mobile/i18n/useI18n";

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
  confirm: (opts: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

let externalShow: ((payload: AlertPayload) => void) | null = null;

export function showAppAlert(payload: AlertPayload) {
  externalShow?.(payload);
}

export function showAppConfirm(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const c = getStrings(getLocaleRef()).common;
  showAppAlert({
    title: opts.title,
    message: opts.message,
    buttons: [
      { text: opts.cancelText ?? c.cancel, style: "cancel" },
      {
        text: opts.confirmText ?? c.confirm,
        style: opts.destructive ? "destructive" : "default",
        onPress: opts.onConfirm,
      },
    ],
  });
}

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<AlertPayload | null>(null);
  const styles = useAlertStyles();

  const dismiss = useCallback(() => {
    setVisible(false);
    setPayload(null);
  }, []);

  const show = useCallback((next: AlertPayload) => {
    setPayload(next);
    setVisible(true);
  }, []);

  const confirm = useCallback(
    (opts: Parameters<AlertContextValue["confirm"]>[0]) => {
      showAppConfirm(opts);
    },
    [],
  );

  useEffect(() => {
    externalShow = show;
    return () => {
      externalShow = null;
    };
  }, [show]);

  const defaultOk = getStrings(getLocaleRef()).common.ok;
  const buttons =
    payload?.buttons && payload.buttons.length > 0
      ? payload.buttons
      : [{ text: defaultOk, style: "default" as const }];

  const onButtonPress = (btn: AlertButton) => {
    dismiss();
    btn.onPress?.();
  };

  return (
    <AlertContext.Provider value={{ show, confirm }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{payload?.title}</Text>
            {payload?.message ? (
              <Text style={styles.message}>{payload.message}</Text>
            ) : null}

            <View style={styles.btnArea}>
              {buttons.length === 1 ? (
                <Pressable style={styles.singleBtn} onPress={() => onButtonPress(buttons[0])}>
                  <Text style={[styles.btnText, styles.btnDefault]}>{buttons[0].text}</Text>
                </Pressable>
              ) : (
                <View style={styles.btnRow}>
                  {buttons.map((btn, i) => (
                    <Pressable
                      key={`${btn.text}-${i}`}
                      style={[styles.btnCell, i > 0 && styles.btnCellBorder]}
                      onPress={() => onButtonPress(btn)}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          btn.style === "destructive" && styles.btnDestructive,
                          btn.style === "cancel" && styles.btnCancel,
                          (!btn.style || btn.style === "default") && styles.btnDefault,
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

function useAlertStyles() {
  return useThemedStyles((c, fontScale) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 28,
    },
    card: {
      width: "100%" as const,
      maxWidth: 320,
      backgroundColor: c.surfaceElevated,
      borderRadius: 14,
      overflow: "hidden" as const,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    title: {
      fontSize: 17 * fontScale,
      fontWeight: "600" as const,
      color: c.foreground,
      textAlign: "center" as const,
      paddingTop: 20,
      paddingHorizontal: 20,
      lineHeight: 22,
    },
    message: {
      fontSize: 13 * fontScale,
      color: c.muted,
      textAlign: "center" as const,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
      lineHeight: 18,
    },
    btnArea: {
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    singleBtn: {
      paddingVertical: 14,
      alignItems: "center" as const,
    },
    btnRow: {
      flexDirection: "row" as const,
    },
    btnCell: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    btnCellBorder: {
      borderLeftWidth: 1,
      borderLeftColor: c.cardBorder,
    },
    btnText: {
      fontSize: 17 * fontScale,
      fontWeight: "600" as const,
    },
    btnDefault: { color: c.brand },
    btnCancel: { color: c.muted, fontWeight: "500" as const },
    btnDestructive: { color: c.emergency },
  }));
}
