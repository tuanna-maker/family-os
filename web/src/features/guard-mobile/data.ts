/** Mock / seed data for STOS Guard mobile screens (Phase 1). */

export type GuardShiftStatus = "on_duty" | "patrol" | "break" | "off";

export const guardProfile = {
  name: "Trần Văn Hùng",
  id: "G-014",
  zone: "Cổng chính · Tháp A",
  project: "Vinhomes Smart City",
  shift: "Ca sáng 06:00 – 14:00",
  avatarInitials: "TH",
};

export const dutyKpis = [
  { label: "Checkpoint", value: "3/5", sub: "Còn 2 điểm", tone: "info" as const },
  { label: "Quét QR", value: "42", sub: "Hôm nay", tone: "success" as const },
  { label: "Nhiệm vụ", value: "2", sub: "Đang mở", tone: "warning" as const },
];

export const patrolCheckpoints = [
  { id: "cp1", name: "Cổng chính A", due: "06:30", done: true, lat: "10.78" },
  { id: "cp2", name: "Lobby tháp A", due: "08:00", done: true, lat: "10.78" },
  { id: "cp3", name: "Hầm xe B1", due: "10:00", done: true, lat: "10.77" },
  { id: "cp4", name: "Sảnh sự kiện", due: "12:00", done: false, lat: "10.79" },
  { id: "cp5", name: "Bãi xe ngoài", due: "13:30", done: false, lat: "10.76" },
];

export const guardTasks = [
  {
    id: "t1",
    type: "SOS",
    title: "SOS căn A2-1502",
    location: "Tháp A · Tầng 15",
    priority: "P1",
    ago: "2 phút",
    status: "open",
  },
  {
    id: "t2",
    type: "Khách",
    title: "Khách chờ duyệt QR",
    location: "Cổng chính",
    priority: "P2",
    ago: "5 phút",
    status: "open",
  },
  {
    id: "t3",
    type: "Tuần tra",
    title: "Checkpoint trễ · Sảnh sự kiện",
    location: "Khu sự kiện",
    priority: "P3",
    ago: "18 phút",
    status: "open",
  },
];

export const recentScans = [
  { id: "s1", name: "Nguyễn Văn A", unit: "A2-1208", direction: "Vào", time: "14:02", ok: true },
  { id: "s2", name: "Khách: Lê Thị B", unit: "B1-0901", direction: "Ra", time: "13:58", ok: true },
  { id: "s3", name: "Xe 30A-12345", unit: "Bãi B2", direction: "Vào", time: "13:41", ok: true },
];
