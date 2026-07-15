/** Báo thiếu từng trường — không gộp chung khi chỉ thiếu một ô. */
export function missingFieldMessage(fields: { value: string; label: string }[]): string | null {
  const missing = fields.filter((f) => !f.value.trim());
  if (missing.length === 0) return null;
  if (missing.length === 1) return `Vui lòng nhập ${missing[0].label.toLowerCase()}`;
  const labels = missing.map((f) => f.label.toLowerCase());
  if (labels.length === 2) return `Vui lòng nhập ${labels[0]} và ${labels[1]}`;
  return `Vui lòng nhập ${labels.slice(0, -1).join(", ")} và ${labels[labels.length - 1]}`;
}
