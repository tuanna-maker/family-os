import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { pullAndPresentGuardNotifications } from "@mobile/lib/guard-notification-pull";

export const GUARD_BACKGROUND_NOTIFICATION_TASK = "stos-guard-background-notification-fetch";

TaskManager.defineTask(GUARD_BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    const showed = await pullAndPresentGuardNotifications();
    return showed
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerGuardBackgroundNotificationTask() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      GUARD_BACKGROUND_NOTIFICATION_TASK,
    );
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(GUARD_BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 60 * 15,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    // Background fetch unavailable on this build.
  }
}

export async function unregisterGuardBackgroundNotificationTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      GUARD_BACKGROUND_NOTIFICATION_TASK,
    );
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(GUARD_BACKGROUND_NOTIFICATION_TASK);
    }
  } catch {
    // Best-effort.
  }
}
