export type HomeLocale = "vi" | "en";

const security = {
  vi: {
    chipCamera: "Camera & An ninh",
    chipFire: "PCCC",
    chipElevator: "Thang máy",
    okActive: "Hoạt động",
    okNormal: "Bình thường",
    alertCount: (n: number) => `${n} cảnh báo`,
    allNormal: "Tất cả bình thường",
    noOpenAlerts: "Không có cảnh báo đang mở",
    emergency: "Cảnh báo khẩn cấp",
    sosOpen: (n: number) => `${n} yêu cầu SOS đang mở`,
    fireOpen: "Báo cháy chưa xử lý",
    elderUrgent: "Người thân cần hỗ trợ ngay",
    hasAlerts: "Có cảnh báo cần xem",
    pendingItems: (n: number) => `${n} mục đang chờ xử lý`,
  },
  en: {
    chipCamera: "Cameras & security",
    chipFire: "Fire safety",
    chipElevator: "Elevators",
    okActive: "Active",
    okNormal: "Normal",
    alertCount: (n: number) => `${n} alert${n === 1 ? "" : "s"}`,
    allNormal: "All normal",
    noOpenAlerts: "No open alerts",
    emergency: "Emergency alert",
    sosOpen: (n: number) => `${n} open SOS request${n === 1 ? "" : "s"}`,
    fireOpen: "Unresolved fire alert",
    elderUrgent: "A family member needs help now",
    hasAlerts: "Alerts need attention",
    pendingItems: (n: number) => `${n} item${n === 1 ? "" : "s"} pending`,
  },
} as const;

const familyToday = {
  vi: {
    normal: "Bình thường",
    stable: "Ổn định",
    needsAttention: "Cần chú ý",
    monitoring: "Theo dõi",
    checkupToday: "Khám hôm nay",
    medDue: "Có thuốc cần uống",
    medSoon: "Sắp uống thuốc",
    justUpdated: "Vừa cập nhật",
    updatedHoursAgo: (h: number) => `Cập nhật ${h}h trước`,
    elderDefault: "Ông/Bà",
    childDefault: "Con",
    doctorPrefix: (name: string) => `BS ${name}`,
    overdueHw: (n: number) => `${n} bài quá hạn`,
    reminders: (n: number) => `${n} lời nhắc`,
    hwToday: (n: number) => `${n} bài hôm nay`,
    hwUpcoming: (n: number) => `${n} bài sắp tới`,
    dueOn: (date: string) => `Hạn ${date}`,
  },
  en: {
    normal: "Normal",
    stable: "Stable",
    needsAttention: "Needs attention",
    monitoring: "Monitoring",
    checkupToday: "Check-up today",
    medDue: "Medication due",
    medSoon: "Medication soon",
    justUpdated: "Just updated",
    updatedHoursAgo: (h: number) => `Updated ${h}h ago`,
    elderDefault: "Elder",
    childDefault: "Child",
    doctorPrefix: (name: string) => `Dr. ${name}`,
    overdueHw: (n: number) => `${n} overdue assignment${n === 1 ? "" : "s"}`,
    reminders: (n: number) => `${n} reminder${n === 1 ? "" : "s"}`,
    hwToday: (n: number) => `${n} due today`,
    hwUpcoming: (n: number) => `${n} upcoming`,
    dueOn: (date: string) => `Due ${date}`,
  },
} as const;

export function securityCopy(locale: HomeLocale = "vi") {
  return security[locale];
}

export function familyTodayCopy(locale: HomeLocale = "vi") {
  return familyToday[locale];
}

export function normalizeHomeLocale(value?: string | null): HomeLocale {
  return value === "en" ? "en" : "vi";
}
