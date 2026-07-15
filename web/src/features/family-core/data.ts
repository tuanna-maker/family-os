// ============================================================
// FAMILY CORE — Dữ liệu thuộc về cuộc sống gia đình
// Tài chính, sức khỏe, con cái, ông bà, ăn uống, du lịch.
// ============================================================

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  age: number;
  avatar: string;
};

export const family = {
  name: "Gia đình Nguyễn",
  apartment: "Căn hộ A-1502, Tòa Sunrise",
  members: [
    { id: "1", name: "Bố Nam", role: "Bố", age: 38, avatar: "👨🏻" },
    { id: "2", name: "Mẹ Linh", role: "Mẹ", age: 35, avatar: "👩🏻" },
    { id: "3", name: "Bé Minh", role: "Con trai", age: 8, avatar: "🧒🏻" },
    { id: "4", name: "Bé Na", role: "Con gái", age: 5, avatar: "👧🏻" },
    { id: "5", name: "Bà Hoa", role: "Bà nội", age: 68, avatar: "👵🏻" },
    { id: "6", name: "Cô Mai", role: "Giúp việc", age: 42, avatar: "🧑🏻‍🍳" },
  ] satisfies FamilyMember[],
};

export const familyReminders = [
  { id: "1", icon: "🎹", title: "Bé Minh có lớp Piano", time: "18:00", tone: "blue" as const },
  { id: "2", icon: "💊", title: "Bà Hoa uống thuốc huyết áp", time: "20:00", tone: "green" as const },
  { id: "3", icon: "🥬", title: "2 thực phẩm sắp hết hạn", time: "Hôm nay", tone: "orange" as const },
  { id: "4", icon: "⚡", title: "Hóa đơn điện đến hạn", time: "Ngày mai", tone: "purple" as const },
];

export const familyServices = [
  { id: "expenses", label: "Chi tiêu", icon: "💳", tint: "tint-blue", to: "/chi-tieu" as const },
  { id: "children", label: "Đồng hành cùng con", icon: "🎒", tint: "tint-purple", to: "/con-cai" as const },
  { id: "health", label: "Sức khỏe", icon: "❤️", tint: "tint-red", to: "/suc-khoe" as const },
  { id: "fridge", label: "Tủ lạnh", icon: "🥗", tint: "tint-green", to: "/thuc-pham" as const },
  { id: "calendar", label: "Lịch gia đình", icon: "📅", tint: "tint-blue", to: "/lich-gia-dinh" as const },
  { id: "elderly", label: "Chăm sóc ông bà", icon: "👵", tint: "tint-pink", to: "/cham-soc-ong-ba" as const },
  { id: "helper", label: "Giúp việc", icon: "🧑‍🍳", tint: "tint-orange", to: "/quan-ly-giup-viec" as const },
  { id: "memories", label: "Kỷ niệm", icon: "📸", tint: "tint-purple", to: "/ky-niem-gia-dinh" as const },
  { id: "travel", label: "Du lịch", icon: "✈️", tint: "tint-orange", to: "/du-lich" as const },
  { id: "family", label: "Gia đình", icon: "👨‍👩‍👧", tint: "tint-blue", to: "/gia-dinh" as const },
];

export const expenses = {
  total: 18450000,
  budget: 25000000,
  insight:
    "Chi tiêu tháng này giảm 8% so với tháng trước. Bạn đang tiết kiệm tốt cho khoản giáo dục.",
  categories: [
    { name: "Ăn uống", amount: 6200000, icon: "🍱", color: "var(--success)" },
    { name: "Nhà cửa", amount: 4800000, icon: "🏠", color: "var(--brand)" },
    { name: "Con cái", amount: 3500000, icon: "🎒", color: "var(--pink)" },
    { name: "Sức khỏe", amount: 1850000, icon: "💊", color: "var(--emergency)" },
    { name: "Giải trí", amount: 1200000, icon: "🎬", color: "var(--warning)" },
    { name: "Khác", amount: 900000, icon: "✨", color: "var(--info)" },
  ],
  recent: [
    { id: "1", title: "Siêu thị Co.opmart", category: "Ăn uống", amount: 420000, date: "Hôm nay" },
    { id: "2", title: "Lớp Piano bé Minh", category: "Con cái", amount: 1200000, date: "Hôm qua" },
    { id: "3", title: "Hóa đơn điện", category: "Nhà cửa", amount: 780000, date: "2 ngày trước" },
    { id: "4", title: "Khám bệnh bà Hoa", category: "Sức khỏe", amount: 350000, date: "3 ngày trước" },
  ],
};
