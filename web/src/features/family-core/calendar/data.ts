// FAMILY CORE — Lịch gia đình (mock)
export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  member: string;
  category: "school" | "health" | "work" | "family" | "other";
  icon: string;
};

export const calendarEvents: CalendarEvent[] = [
  { id: "c1", title: "Họp phụ huynh bé Minh", date: "2026-05-20", time: "18:00", member: "Mẹ Linh", category: "school", icon: "🎒" },
  { id: "c2", title: "Khám định kỳ bà Hoa", date: "2026-05-21", time: "09:30", member: "Bà Hoa", category: "health", icon: "🏥" },
  { id: "c3", title: "Sinh nhật bé Na", date: "2026-05-23", time: "17:00", member: "Cả nhà", category: "family", icon: "🎂" },
  { id: "c4", title: "Lớp Piano bé Minh", date: "2026-05-19", time: "18:00", member: "Bé Minh", category: "school", icon: "🎹" },
  { id: "c5", title: "Bố Nam công tác Đà Nẵng", date: "2026-05-25", member: "Bố Nam", category: "work", icon: "✈️" },
  { id: "c6", title: "Ăn tối nhà ông bà ngoại", date: "2026-05-24", time: "19:00", member: "Cả nhà", category: "family", icon: "🍲" },
];

export const calendarCategoryLabel: Record<CalendarEvent["category"], string> = {
  school: "Học tập",
  health: "Sức khỏe",
  work: "Công việc",
  family: "Gia đình",
  other: "Khác",
};
