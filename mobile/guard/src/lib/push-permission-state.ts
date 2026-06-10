import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "stos:os-push-permission-requested";

export async function wasOsPushPermissionRequested() {
  return (await AsyncStorage.getItem(KEY)) === "1";
}

export async function markOsPushPermissionRequested() {
  await AsyncStorage.setItem(KEY, "1");
}

export async function clearOsPushPermissionRequested() {
  await AsyncStorage.removeItem(KEY);
}
