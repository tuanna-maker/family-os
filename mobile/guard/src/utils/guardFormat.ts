import type { GuardShift } from "@guard/api/guard-shifts";

const SHIFT_LABEL: Record<GuardShift["shift_type"], string> = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  night: "Ca đêm",
};

const SHIFT_TIME: Record<GuardShift["shift_type"], string> = {
  morning: "06:00 - 14:00",
  afternoon: "14:00 - 22:00",
  night: "22:00 - 06:00",
};

const DAY_NAMES = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function shiftLabel(type: GuardShift["shift_type"]) {
  return SHIFT_LABEL[type] ?? type;
}

export function shiftTimeRange(type: GuardShift["shift_type"]) {
  return SHIFT_TIME[type] ?? "";
}

export function formatAge(createdAt: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  if (sec < 60) return `${sec} giây`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} giờ ${rm} phút` : `${h} giờ`;
}

export function formatNotifTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(createdAt).toLocaleDateString("vi-VN");
}

export function dayChip(dateIso: string) {
  const d = new Date(dateIso);
  return {
    day: DAY_NAMES[d.getDay()],
    date: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
  };
}

export function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  sos: "SOS khẩn cấp",
  fire: "Báo cháy",
  intrusion: "Người lạ / xâm nhập",
  noise: "Tiếng ồn",
  package: "Nhận hàng hộ",
  shipping: "Gửi hàng đi",
  delivery: "Giao tận căn hộ",
  home_care: "Chăm sóc tại nhà",
  escort: "Đưa đón căn hộ",
  remote_freight: "Chuyển hàng từ xa",
  freight_lift: "Thanh hàng / người hỗ trợ",
  guard_handle: "Bảo vệ xử lý hộ",
  hourly_guard: "Bảo vệ theo giờ",
  custom_guard: "Bảo vệ theo nhu cầu",
  other: "Khác",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: "Chờ xử lý",
  in_progress: "Đang xử lý",
};
