/** URL ảnh nhỏ cho lưới kỷ niệm — ưu tiên thumbnail, resize Supabase nếu có. */
export function momentThumbUrl(
  mediaUrl: string,
  thumbnailUrl?: string | null,
  size = 420,
): string {
  const base = thumbnailUrl?.trim() || mediaUrl;
  if (!base) return mediaUrl;

  const renderPrefix = "/storage/v1/render/image/public/";
  const objectPrefix = "/storage/v1/object/public/";
  if (base.includes(objectPrefix) && !base.includes(renderPrefix)) {
    const transformed = base.replace(objectPrefix, renderPrefix);
    const sep = transformed.includes("?") ? "&" : "?";
    return `${transformed}${sep}width=${size}&height=${size}&resize=cover&quality=75`;
  }

  return base;
}
