import { showAppAlert, type AlertButtonStyle } from "@mobile/components/AppAlert";

type LegacyButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

/** Thay thế `Alert.alert` — giao diện kiểu iOS, dùng chung toàn app. */
export function appAlert(title: string, message?: string, buttons?: LegacyButton[]) {
  if (!buttons || buttons.length === 0) {
    showAppAlert({ title, message });
    return;
  }
  showAppAlert({
    title,
    message,
    buttons: buttons.map((b) => ({
      text: b.text,
      style: b.style as AlertButtonStyle | undefined,
      onPress: b.onPress,
    })),
  });
}
