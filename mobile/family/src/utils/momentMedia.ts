/** URL ảnh nhỏ cho lưới kỷ niệm — ưu tiên thumbnail, resize Supabase nếu bucket public. */
export function momentThumbUrl(
  mediaUrl: string,
  thumbnailUrl?: string | null,
  size = 420,
): string {
  const base = thumbnailUrl?.trim() || mediaUrl;
  if (!base) return mediaUrl;

  if (base.includes("/object/sign/") || base.includes("token=")) {
    return base;
  }

  const renderPrefix = "/storage/v1/render/image/public/";
  const objectPrefix = "/storage/v1/object/public/";
  if (base.includes(objectPrefix) && !base.includes(renderPrefix)) {
    const transformed = base.replace(objectPrefix, renderPrefix);
    const sep = transformed.includes("?") ? "&" : "?";
    return `${transformed}${sep}width=${size}&height=${size}&resize=cover&quality=75`;
  }

  return base;
}

/** Resolve thumb URL — ưu tiên signed map khi bucket private. */
export function resolveMomentThumbUrl(
  mediaUrl: string,
  thumbnailUrl: string | null | undefined,
  signed?: Map<string, string>,
  size = 420,
): string {
  const raw = momentThumbUrl(mediaUrl, thumbnailUrl, size);
  if (!signed) return raw;
  for (const key of [thumbnailUrl, mediaUrl, raw]) {
    if (key && signed.has(key)) return signed.get(key)!;
  }
  return raw;
}
