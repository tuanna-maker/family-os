/** Legacy seeded keys (Vietnamese display names used as keys). */
export const LEGACY_VI_CATEGORY_KEYS: Record<string, string> = {
  "Ăn uống": "dining",
  "Nhà cửa": "housing",
  "Con cái": "children",
  "Sức khỏe": "health",
  "Giải trí": "entertainment",
  Khác: "other",
};

export function normalizeCategoryKey(key: string): string {
  return LEGACY_VI_CATEGORY_KEYS[key] ?? key;
}

/** ASCII slug for internal category_key (not shown as display name). */
export function slugifyCategoryKey(labelVi: string, labelEn?: string): string {
  const src = (labelEn?.trim() || labelVi.trim()).normalize("NFD");
  const ascii = src
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return ascii || "category";
}

export function isValidCategoryKey(key: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(key);
}
