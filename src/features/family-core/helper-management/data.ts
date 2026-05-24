// FAMILY CORE — Quản lý giúp việc (mock data)
export type Helper = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  phone: string;
  startDate: string;
  salary: number;
  status: "active" | "leave";
  verified: boolean;
  idNumber: string;
  hometown: string;
  rating: number;
};

export type HelperTask = {
  id: string;
  title: string;
  time: string;
  done: boolean;
  icon: string;
};

export type AttendanceDay = {
  date: string;
  status: "present" | "absent" | "leave";
};

export type PaymentRow = {
  id: string;
  month: string;
  amount: number;
  status: "paid" | "pending";
};

export type WorkScheduleDay = {
  day: string;
  hours: string;
  off: boolean;
};

export type HelperPermission = {
  id:
    | "can_receive_package"
    | "can_view_tasks"
    | "can_use_qr_access"
    | "can_view_family_notes"
    | "cannot_view_finance"
    | "cannot_view_health"
    | "cannot_view_children_private_data";
  label: string;
  desc: string;
  enabled: boolean;
  kind: "allow" | "deny";
};

export type HelperActivity = {
  id: string;
  kind: "qr" | "task" | "package" | "schedule" | "note";
  title: string;
  detail: string;
  at: string;
};

export const helpers: Helper[] = [
  {
    id: "h1",
    name: "Cô Mai",
    avatar: "🧑🏻‍🍳",
    role: "Giúp việc toàn thời gian",
    phone: "0912 345 678",
    startDate: "01/03/2024",
    salary: 7500000,
    status: "active",
    verified: true,
    idNumber: "CCCD ••• 4521",
    hometown: "Nam Định",
    rating: 4.8,
  },
];

export const helperTasks: HelperTask[] = [
  { id: "ht1", title: "Dọn bếp", time: "06:30", done: true, icon: "🧽" },
  { id: "ht2", title: "Đưa bé đi học", time: "06:45", done: true, icon: "🚸" },
  { id: "ht3", title: "Nhận hàng Farm Fresh", time: "09:00", done: false, icon: "📦" },
  { id: "ht4", title: "Cho thú cưng ăn", time: "11:00", done: false, icon: "🐕" },
  { id: "ht5", title: "Đổ rác", time: "17:00", done: false, icon: "🗑️" },
  { id: "ht6", title: "Kiểm tra cửa", time: "21:30", done: false, icon: "🚪" },
];

export const attendance: AttendanceDay[] = [
  { date: "T2", status: "present" },
  { date: "T3", status: "present" },
  { date: "T4", status: "present" },
  { date: "T5", status: "leave" },
  { date: "T6", status: "present" },
  { date: "T7", status: "present" },
  { date: "CN", status: "absent" },
];

export const payments: PaymentRow[] = [
  { id: "p1", month: "Tháng 5/2026", amount: 7500000, status: "pending" },
  { id: "p2", month: "Tháng 4/2026", amount: 7500000, status: "paid" },
  { id: "p3", month: "Tháng 3/2026", amount: 7500000, status: "paid" },
];

export const workSchedule: WorkScheduleDay[] = [
  { day: "Thứ 2", hours: "06:00 — 18:00", off: false },
  { day: "Thứ 3", hours: "06:00 — 18:00", off: false },
  { day: "Thứ 4", hours: "06:00 — 18:00", off: false },
  { day: "Thứ 5", hours: "Nghỉ", off: true },
  { day: "Thứ 6", hours: "06:00 — 18:00", off: false },
  { day: "Thứ 7", hours: "07:00 — 14:00", off: false },
  { day: "Chủ nhật", hours: "Nghỉ", off: true },
];

export const defaultPermissions: HelperPermission[] = [
  {
    id: "can_receive_package",
    label: "Nhận hàng giúp gia đình",
    desc: "Được phép nhận đơn hàng, ký xác nhận thay chủ nhà",
    enabled: true,
    kind: "allow",
  },
  {
    id: "can_view_tasks",
    label: "Xem & cập nhật công việc",
    desc: "Xem checklist công việc trong ngày và đánh dấu hoàn thành",
    enabled: true,
    kind: "allow",
  },
  {
    id: "can_use_qr_access",
    label: "Dùng QR ra vào toà nhà",
    desc: "Mã QR cá nhân để bảo vệ xác minh khi ra/vào",
    enabled: true,
    kind: "allow",
  },
  {
    id: "can_view_family_notes",
    label: "Xem ghi chú gia đình",
    desc: "Đọc các ghi chú công khai về lịch sinh hoạt, dặn dò",
    enabled: false,
    kind: "allow",
  },
  {
    id: "cannot_view_finance",
    label: "Không xem tài chính",
    desc: "Ẩn hoá đơn, chi tiêu, tiền lương của gia đình",
    enabled: true,
    kind: "deny",
  },
  {
    id: "cannot_view_health",
    label: "Không xem hồ sơ sức khoẻ",
    desc: "Ẩn dữ liệu y tế, đơn thuốc, lịch khám của các thành viên",
    enabled: true,
    kind: "deny",
  },
  {
    id: "cannot_view_children_private_data",
    label: "Không xem dữ liệu riêng tư của trẻ",
    desc: "Ẩn nhật ký, hình ảnh và thông tin học tập chi tiết của bé",
    enabled: true,
    kind: "deny",
  },
];

export const helperActivity: HelperActivity[] = [
  { id: "la1", kind: "qr", title: "QR ra vào", detail: "Quét QR cổng B lúc vào nhà", at: "Hôm nay 06:12" },
  { id: "la2", kind: "task", title: "Hoàn thành công việc", detail: "Đã đưa bé Minh đi học", at: "Hôm nay 06:55" },
  { id: "la3", kind: "package", title: "Nhận hàng", detail: "Farm Fresh — 2 gói rau, ký nhận", at: "Hôm qua 09:10" },
  { id: "la4", kind: "schedule", title: "Lịch nghỉ", detail: "Thứ 5 xin nghỉ phép có lương", at: "Hôm qua 18:00" },
  { id: "la5", kind: "note", title: "Ghi chú", detail: "Mẹ Linh nhắn: nấu cháo cho bé An buổi tối", at: "Hôm qua 16:20" },
];
