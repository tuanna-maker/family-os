// FAMILY CORE — Chăm sóc ông bà (mock data — backend tables sẽ thêm sau)
export type ElderlyProfile = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  relation: string;
  conditions: string[];
  doctor: string;
  phone: string;
  address: string;
  safeCheck: {
    status: "ok" | "warn" | "alert";
    lastSeen: string;
    note: string;
  };
};

export type VitalLog = {
  id: string;
  label: string;
  value: string;
  unit: string;
  status: "ok" | "warn" | "alert";
  takenAt: string;
  icon: string;
};

export type CareTask = {
  id: string;
  title: string;
  time: string;
  assignee: string;
  done: boolean;
  icon: string;
};

export type MedicationReminder = {
  id: string;
  medicine: string;
  dosage: string;
  time: string;
  taken: boolean;
  takenAt?: string;
  note?: string;
};

export type CareNote = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

export type ActivityLogEntry = {
  id: string;
  kind: "med" | "vital" | "call" | "check" | "note" | "sos";
  title: string;
  detail: string;
  at: string;
};

export type EmergencyContact = {
  id: string;
  label: string;
  name: string;
  phone: string;
  kind: "elder" | "family" | "security" | "sos";
};

export const elderlyProfiles: ElderlyProfile[] = [
  {
    id: "e1",
    name: "Bà Hoa",
    avatar: "👵🏻",
    age: 68,
    relation: "Bà nội",
    conditions: ["Huyết áp cao", "Tiểu đường type 2"],
    doctor: "BS. Trần Văn An — BV Đại học Y",
    phone: "0901 234 567",
    address: "Căn hộ A12-08, Vinhomes Central Park",
    safeCheck: {
      status: "ok",
      lastSeen: "09:12 sáng nay",
      note: "Đã xác nhận khoẻ qua nút Safe Check",
    },
  },
  {
    id: "e2",
    name: "Ông Tâm",
    avatar: "👴🏻",
    age: 72,
    relation: "Ông ngoại",
    conditions: ["Thoái hóa khớp"],
    doctor: "BS. Lê Thị Bình — PK Vinmec",
    phone: "0903 456 789",
    address: "Căn hộ A12-08, Vinhomes Central Park",
    safeCheck: {
      status: "warn",
      lastSeen: "Hôm qua 21:40",
      note: "Chưa xác nhận sáng nay",
    },
  },
];

export const vitalLogs: VitalLog[] = [
  { id: "v1", label: "Huyết áp", value: "135/85", unit: "mmHg", status: "warn", takenAt: "Sáng nay 07:00", icon: "🩺" },
  { id: "v2", label: "Đường huyết", value: "6.2", unit: "mmol/L", status: "ok", takenAt: "Sáng nay 07:15", icon: "🩸" },
  { id: "v3", label: "Nhịp tim", value: "78", unit: "bpm", status: "ok", takenAt: "Sáng nay 07:00", icon: "❤️" },
  { id: "v4", label: "Cân nặng", value: "58", unit: "kg", status: "ok", takenAt: "Hôm qua", icon: "⚖️" },
];

export const careTasks: CareTask[] = [
  { id: "t1", title: "Uống thuốc huyết áp", time: "07:00", assignee: "Cô Mai", done: true, icon: "💊" },
  { id: "t2", title: "Đi bộ nhẹ 20 phút", time: "16:30", assignee: "Bố Nam", done: false, icon: "🚶" },
  { id: "t3", title: "Uống thuốc tiểu đường", time: "20:00", assignee: "Mẹ Linh", done: false, icon: "💊" },
  { id: "t4", title: "Đo huyết áp tối", time: "21:00", assignee: "Cô Mai", done: false, icon: "🩺" },
];

export const medicationReminders: MedicationReminder[] = [
  { id: "m1", medicine: "Amlodipine 5mg", dosage: "1 viên sau ăn sáng", time: "07:00", taken: true, takenAt: "07:05", note: "Huyết áp" },
  { id: "m2", medicine: "Metformin 500mg", dosage: "1 viên sau ăn trưa", time: "12:30", taken: false, note: "Tiểu đường" },
  { id: "m3", medicine: "Glucosamine", dosage: "1 viên sau ăn tối", time: "19:30", taken: false, note: "Khớp" },
  { id: "m4", medicine: "Metformin 500mg", dosage: "1 viên trước khi ngủ", time: "21:30", taken: false, note: "Tiểu đường" },
];

export const careNotes: CareNote[] = [
  { id: "n1", author: "Mẹ Linh", content: "Bà ăn cơm ít hơn hôm qua, để ý thêm bữa chiều.", createdAt: "Hôm nay 08:20" },
  { id: "n2", author: "Cô Mai", content: "Bà than đau đầu nhẹ buổi sáng, đã đo huyết áp 135/85.", createdAt: "Hôm nay 07:10" },
  { id: "n3", author: "Bố Nam", content: "Đã đưa bà đi bộ công viên 25 phút, tinh thần tốt.", createdAt: "Hôm qua 17:00" },
];

export const activityLog: ActivityLogEntry[] = [
  { id: "a1", kind: "check", title: "Safe Check", detail: "Bà Hoa xác nhận khoẻ", at: "09:12" },
  { id: "a2", kind: "med", title: "Đã uống thuốc", detail: "Amlodipine 5mg — Bà Hoa", at: "07:05" },
  { id: "a3", kind: "vital", title: "Đo huyết áp", detail: "135/85 mmHg — Cô Mai ghi nhận", at: "07:00" },
  { id: "a4", kind: "call", title: "Gọi người thân", detail: "Mẹ Linh gọi cho Bà Hoa (4 phút)", at: "Hôm qua 20:15" },
  { id: "a5", kind: "note", title: "Ghi chú chăm sóc", detail: "Bố Nam: đi bộ công viên 25 phút", at: "Hôm qua 17:00" },
];

export const emergencyContacts: EmergencyContact[] = [
  { id: "c1", label: "Gọi ông/bà", name: "Bà Hoa", phone: "0901234567", kind: "elder" },
  { id: "c2", label: "Gọi người thân", name: "Mẹ Linh", phone: "0912345678", kind: "family" },
  { id: "c3", label: "Gọi bảo an", name: "Bảo an toà nhà", phone: "1900111", kind: "security" },
  { id: "c4", label: "SOS khẩn cấp", name: "Cấp cứu 115", phone: "115", kind: "sos" },
];
