import { Alert } from "react-native";

export const toast = {
  success: (msg: string) => Alert.alert("Thành công", msg),
  error: (msg: string, description?: string) => Alert.alert("Lỗi", description ? `${msg}\n${description}` : msg),
};
