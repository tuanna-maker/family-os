import { showAppAlert } from "@mobile/components/AppAlert";
import { getLocaleRef } from "@mobile/i18n/localeRef";
import { getStrings } from "@mobile/i18n/useI18n";

function titles() {
  return getStrings(getLocaleRef()).toast;
}

export const toast = {
  success: (message: string, title?: string) => {
    showAppAlert({ title: title ?? titles().success, message });
  },
  error: (message: string, description?: string) => {
    showAppAlert({
      title: titles().error,
      message: description ? `${message}\n\n${description}` : message,
    });
  },
  info: (message: string, title?: string) => {
    showAppAlert({ title: title ?? titles().info, message });
  },
};
