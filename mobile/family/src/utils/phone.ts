import { InteractionManager, Linking } from "react-native";

/** Mở trình quay số — defer để tránh kẹt touch sau khi quay lại app (Android). */
export function openPhoneDialer(phone: string) {
  const tel = `tel:${phone.replace(/[\s\-.()]/g, "")}`;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      void Linking.canOpenURL(tel)
        .then((ok) => (ok ? Linking.openURL(tel) : undefined))
        .catch(() => undefined);
    }, 50);
  });
}
