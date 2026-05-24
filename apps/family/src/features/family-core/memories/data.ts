// FAMILY CORE — Kỷ niệm gia đình (mock)
export type Album = {
  id: string;
  title: string;
  cover: string;
  count: number;
  date: string;
  category: AlbumCategory;
  tone: "blue" | "pink" | "green" | "orange" | "purple";
};

export type AlbumCategory =
  | "Du lịch"
  | "Sinh nhật"
  | "Học tập"
  | "Cuối tuần"
  | "Bữa cơm gia đình"
  | "Ngày đặc biệt";

export type Milestone = {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: string;
};

export type TimelineEntry = {
  id: string;
  date: string;
  monthLabel: string;
  title: string;
  description: string;
  icon: string;
  tone: "blue" | "pink" | "green" | "orange" | "purple";
  photoCount?: number;
};

export type MemorySuggestion = {
  id: string;
  title: string;
  hint: string;
  icon: string;
};

export const albumCategories: { key: AlbumCategory; emoji: string }[] = [
  { key: "Du lịch", emoji: "✈️" },
  { key: "Sinh nhật", emoji: "🎂" },
  { key: "Học tập", emoji: "🎓" },
  { key: "Cuối tuần", emoji: "🏡" },
  { key: "Bữa cơm gia đình", emoji: "🍱" },
  { key: "Ngày đặc biệt", emoji: "✨" },
];

export const albums: Album[] = [
  { id: "a1", title: "Tết 2026 quê nội", cover: "🧧", count: 124, date: "Tháng 2/2026", category: "Ngày đặc biệt", tone: "pink" },
  { id: "a2", title: "Du lịch Đà Lạt", cover: "🏞️", count: 86, date: "Tháng 4/2026", category: "Du lịch", tone: "green" },
  { id: "a3", title: "Sinh nhật bé Na 5 tuổi", cover: "🎂", count: 42, date: "Tháng 5/2026", category: "Sinh nhật", tone: "orange" },
  { id: "a4", title: "Bé Minh khai giảng", cover: "🎒", count: 28, date: "Tháng 9/2025", category: "Học tập", tone: "blue" },
  { id: "a5", title: "Cuối tuần nhà ông bà", cover: "🏡", count: 35, date: "Tháng 5/2026", category: "Cuối tuần", tone: "purple" },
  { id: "a6", title: "Bữa cơm Chủ nhật", cover: "🍲", count: 18, date: "Tháng 5/2026", category: "Bữa cơm gia đình", tone: "orange" },
];

export const milestones: Milestone[] = [
  { id: "m1", title: "Bé Na 5 tuổi", description: "Sinh nhật rực rỡ tại nhà với cả gia đình", date: "23/05/2026", icon: "🎂" },
  { id: "m2", title: "Bé Minh đạt giải Piano", description: "Giải Nhì cuộc thi Piano trẻ TP.HCM", date: "10/04/2026", icon: "🎹" },
  { id: "m3", title: "Kỷ niệm 10 năm cưới", description: "Bố Nam & Mẹ Linh — Maldives", date: "14/02/2026", icon: "💍" },
  { id: "m4", title: "Bà Hoa 68 tuổi", description: "Mừng thọ bà cùng đại gia đình", date: "05/01/2026", icon: "🎉" },
];

export const timeline: TimelineEntry[] = [
  { id: "t1", date: "23/05", monthLabel: "Tháng 5, 2026", title: "Sinh nhật bé Na 5 tuổi", description: "Bữa tiệc ấm cúng với cả nhà nội ngoại", icon: "🎂", tone: "pink", photoCount: 42 },
  { id: "t2", date: "17/05", monthLabel: "Tháng 5, 2026", title: "Bữa cơm Chủ nhật", description: "Mẹ Linh nấu bún bò Huế cho cả nhà", icon: "🍲", tone: "orange", photoCount: 12 },
  { id: "t3", date: "10/05", monthLabel: "Tháng 5, 2026", title: "Cuối tuần nhà ông bà", description: "Các bé chơi vườn rau cùng ông nội", icon: "🏡", tone: "green", photoCount: 24 },
  { id: "t4", date: "20/04", monthLabel: "Tháng 4, 2026", title: "Du lịch Đà Lạt", description: "3 ngày 2 đêm — đồi chè Cầu Đất", icon: "🏞️", tone: "green", photoCount: 86 },
  { id: "t5", date: "10/04", monthLabel: "Tháng 4, 2026", title: "Bé Minh đạt giải Piano", description: "Giải Nhì cuộc thi Piano trẻ TP.HCM", icon: "🎹", tone: "blue", photoCount: 8 },
];

export const aiSuggestions: MemorySuggestion[] = [
  { id: "s1", title: "Tạo album 'Tháng 5 ấm áp'", hint: "AI đã gom 56 ảnh trong tháng — gợi ý ghép thành 1 album", icon: "✨" },
  { id: "s2", title: "Khoảnh khắc 1 năm trước", hint: "Hôm nay, năm 2025 — bé Na tròn 4 tuổi", icon: "⏳" },
  { id: "s3", title: "Bộ ảnh đẹp nhất tuần", hint: "AI chọn 8 ảnh nét, cười tươi nhất", icon: "📸" },
];
