import * as FileSystem from "expo-file-system/legacy";
import { uploadSecurityChatBytes } from "@shared/supabase";

export async function readLocalFileBytes(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export async function uploadSecurityChatMedia(
  localUri: string,
  opts: { userId: string; mimeType: string; ext: string },
): Promise<string> {
  const bytes = await readLocalFileBytes(localUri);
  return uploadSecurityChatBytes(bytes, opts);
}
