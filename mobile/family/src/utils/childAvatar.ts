export function isChildAvatarUrl(value?: string | null) {
  const v = value?.trim() ?? "";
  return v.startsWith("http://") || v.startsWith("https://");
}

export function childAvatarDisplay(avatar: string | null | undefined, name?: string) {
  if (isChildAvatarUrl(avatar)) return { kind: "uri" as const, uri: avatar!.trim() };
  const initial = (name?.trim() || "B").slice(0, 1).toUpperCase();
  return { kind: "initial" as const, initial };
}
