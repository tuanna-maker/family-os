/** Catalog / grid item id → expo-router path (under /bao-an/...) */
export const SECURITY_SERVICE_ROUTES: Record<string, string> = {
  package: "/bao-an/nhan-hang-ho",
  shipping: "/bao-an/gui-hang-di",
  "parcel-receive": "/bao-an/nhan-hang-ho",
  "parcel-deliver": "/bao-an/giao-tan-can-ho",
  "parcel-send": "/bao-an/gui-hang-di",
  "care-home": "/bao-an/cham-soc-tai-nha",
  "care-escort": "/bao-an/dua-don-can-ho",
  "freight-remote": "/bao-an/chuyen-hang-tu-xa",
  "freight-lift": "/bao-an/thanh-hang-nguoi-ho-tro",
  "rem-process": "/bao-an/bao-ve-xu-ly-ho",
  "priv-hourly": "/bao-an/bao-ve-theo-gio",
  "priv-custom": "/bao-an/bao-ve-theo-nhu-cau-rieng",
};

/** Items that open a note dialog instead of a dedicated screen */
export const SECURITY_DIALOG_ITEMS: Record<
  string,
  { requestType: string; label: string }
> = {
  fire: { requestType: "fire", label: "Báo cháy" },
  stranger: { requestType: "intrusion", label: "Báo người lạ" },
  tech: { requestType: "other", label: "Hỗ trợ kỹ thuật" },
  "rem-utility": { requestType: "other", label: "Nhắc tắt điện / nước" },
  "park-arrange": { requestType: "other", label: "Sắp xe đúng vị trí" },
  "park-find": { requestType: "other", label: "Tìm xe nhanh" },
};

export function catalogItemRoute(itemId: string): string | null {
  return SECURITY_SERVICE_ROUTES[itemId] ?? null;
}
