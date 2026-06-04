import * as FileSystem from "expo-file-system";

export async function uriToDataUrl(uri: string): Promise<string> {
  const lower = uri.toLowerCase();
  const mime = lower.includes(".png") ? "image/png" : lower.includes(".webp") ? "image/webp" : "image/jpeg";
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mime};base64,${base64}`;
}
