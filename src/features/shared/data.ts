// ============================================================
// SHARED — Tiện ích & dữ liệu dùng chung cho cả 2 core.
// ============================================================

export const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";

export const getGreeting = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

export const weather = { tempC: 28, condition: "Nhiều mây" };
