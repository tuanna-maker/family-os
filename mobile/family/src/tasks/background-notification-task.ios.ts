import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { pullAndPresentFamilyNotifications } from "@mobile/lib/notification-pull";
import { pullAndPresentFamilyChatNotifications } from "@mobile/lib/chat-notification-pull";

export const FAMILY_BACKGROUND_NOTIFICATION_TASK = "stos-family-background-notification-fetch";

TaskManager.defineTask(FAMILY_BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    const showedNotif = await pullAndPresentFamilyNotifications();
    const showedChat = await pullAndPresentFamilyChatNotifications();
    const showed = showedNotif || showedChat;
    return showed
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerFamilyBackgroundNotificationTask() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      FAMILY_BACKGROUND_NOTIFICATION_TASK,
    );
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(FAMILY_BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 60 * 15,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    // Background fetch unavailable on this build.
  }
}

export async function unregisterFamilyBackgroundNotificationTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      FAMILY_BACKGROUND_NOTIFICATION_TASK,
    );
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(FAMILY_BACKGROUND_NOTIFICATION_TASK);
    }
  } catch {
    // Best-effort.
  }
}
