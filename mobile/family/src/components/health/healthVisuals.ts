import type { AppointmentRow, MedicineRow } from "@mobile/api/health";

export const AVATAR_EMOJIS = ["👨", "👩", "🧒", "👧", "👴", "👵", "🧑", "👦"];

export function avatarFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_EMOJIS[h % AVATAR_EMOJIS.length];
}

export const MEMBER_AVATAR_URL: Record<string, string> = {
  "Cả nhà": "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=120&h=120&fit=crop&crop=faces&q=70&auto=format",
  "Anh Hùng": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces&q=70&auto=format",
  "Chị Lan": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces&q=70&auto=format",
  "Bé Minh": "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=120&h=120&fit=crop&crop=faces&q=70&auto=format",
  "Bé An": "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=120&h=120&fit=crop&crop=faces&q=70&auto=format",
  "Bà Ngoại": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=faces&q=70&auto=format",
};

export const RECORD_KIND_LABEL: Record<string, string> = {
  weight: "Cân nặng",
  height: "Chiều cao",
  blood_pressure: "Huyết áp",
  glucose: "Đường huyết",
  temperature: "Nhiệt độ",
  lab: "Xét nghiệm",
  prescription: "Đơn thuốc",
  note: "Khác",
};

export const PILOT_MEDS: MedicineRow[] = [
  { id: "pilot-m1", member_name: "Chị Lan", medicine: "Omega-3", time_of_day: "20:00", active: true },
  { id: "pilot-m2", member_name: "Anh Hùng", medicine: "Vitamin D3", time_of_day: "07:00", active: true },
  { id: "pilot-m3", member_name: "Bà Ngoại", medicine: "Amlodipine 5mg", time_of_day: "08:00", active: true },
];

function pilotAppt(days: number, member: string, doctor: string, location: string): AppointmentRow {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return {
    id: `pilot-a-${member}`,
    member_name: member,
    doctor,
    scheduled_at: d.toISOString(),
    status: "planned",
  };
}

export const PILOT_APPTS: AppointmentRow[] = [
  pilotAppt(4, "Anh Hùng", "BS. Minh", "Phòng khám STOS"),
  pilotAppt(5, "Bà Ngoại", "BS. Hương", "BV Quận 1"),
];

export const PILOT_INSIGHTS = [
  { emoji: "❤️", text: "Anh Hùng nên duy trì thói quen đi bộ, nhịp tim rất tốt." },
  { emoji: "🌙", text: "Chị Lan ngủ chưa đủ giấc. Nên ngủ sớm hơn 30 phút." },
  { emoji: "✅", text: "Cả nhà đã tiêm phòng đầy đủ. Tiếp theo: Cúm mùa (10/2026)" },
];

export const PILOT_ACTIVITY = [
  { emoji: "✅", text: "Chị Lan đã uống Omega-3", time: "20:00" },
  { emoji: "📅", text: "Anh Hùng có lịch khám BS. Minh", time: "Sắp tới" },
];

export function formatApptShort(iso: string) {
  const d = new Date(iso);
  const hhmm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const dow = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
  return `${hhmm} • ${dow}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function medCountdown(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff += 86400000;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút`;
  return `${Math.floor(mins / 60)} giờ`;
}

export function isApptUpcoming(a: AppointmentRow) {
  if (a.status === "cancelled" || a.status === "done") return false;
  return new Date(a.scheduled_at).getTime() >= Date.now();
}
