export type DetailSection = { title: string; fields: string[] };

export type PayloadRow = { key: string; label: string; value: string };

export type DetailSectionView = { title: string; rows: PayloadRow[] };

const FIELD_LABELS: Record<string, string> = {
  address: "Địa chỉ căn hộ",
  apartment: "Căn hộ",
  recipient_name: "Người nhận hàng",
  phone: "Số điện thoại",
  item_type: "Loại hàng",
  courier: "Đơn vị giao",
  expected_date: "Ngày dự kiến đến",
  expected_time_window: "Khung giờ dự kiến",
  courier_note: "Ghi chú đơn giao",
  hold_plan: "Gói giữ hộ",
  notify_on_arrival: "Thông báo khi hàng đến",
  photo_on_receive: "Chụp ảnh khi nhận hàng",
  estimated_cost: "Phí ước tính",
  estimated_total: "Tổng ước tính",
  sender_name: "Tên người gửi",
  sender_address: "Địa chỉ gửi",
  sender_phone: "SĐT người gửi",
  recipient_address: "Địa chỉ nhận",
  recipient_phone: "SĐT người nhận",
  weight: "Khối lượng",
  description: "Mô tả",
  courier_label: "Đơn vị vận chuyển",
  shipping_fee: "Phí vận chuyển",
  weight_range: "Khối lượng",
  floor_unit: "Tầng / căn",
  expected_window: "Khung giờ giao",
  delivery_note: "Ghi chú giao hàng",
  option_label: "Hình thức giao",
  delivery_fee: "Phí giao hàng",
  target: "Đối tượng",
  start_date: "Ngày bắt đầu",
  start_time: "Giờ bắt đầu",
  duration_label: "Thời lượng",
  duration_hours: "Số giờ",
  tasks: "Công việc",
  contact_name: "Người liên hệ",
  contact_phone: "SĐT liên hệ",
  health_notes: "Ghi chú sức khỏe",
  base_fee: "Phí cơ bản",
  direction_label: "Hướng",
  recipient_target: "Đối tượng được hỗ trợ",
  pickup_location: "Điểm đón",
  dropoff_location: "Điểm đến",
  scheduled_date: "Ngày",
  scheduled_time: "Giờ",
  frequency: "Tần suất",
  extra_note: "Ghi chú thêm",
  pickup_address: "Địa chỉ lấy hàng",
  weight_label: "Khối lượng",
  item_note: "Ghi chú hàng",
  task_label: "Loại hỗ trợ",
  desired_time: "Thời gian mong muốn",
  service_date: "Ngày dịch vụ",
  end_time: "Giờ kết thúc",
  hours: "Số giờ",
  guard_count: "Số bảo vệ",
  service_id: "Loại dịch vụ",
  start_at: "Bắt đầu",
  end_at: "Kết thúc",
  schedule: "Thời gian cần hỗ trợ",
  note: "Ghi chú",
  label: "Tiêu đề",
  service_group: "Nhóm dịch vụ",
  service_item: "Hạng mục",
  incident_type: "Loại sự cố",
  priority: "Ưu tiên",
  zone: "Khu vực",
  location: "Vị trí",
  building: "Toà / Block",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  item_type: {
    package: "Bưu kiện",
    food: "Đồ ăn",
    fragile: "Dễ vỡ",
    document: "Tài liệu",
    other: "Khác",
  },
  hold_plan: {
    standard: "Giữ hộ tiêu chuẩn",
    extended: "Giữ hộ mở rộng",
    long_term: "Giữ hộ dài hạn",
  },
  target: {
    elderly: "Người lớn tuổi",
    child: "Trẻ em",
    patient: "Bệnh nhân",
    other: "Khác",
  },
  recipient_target: {
    elderly: "Người lớn tuổi",
    child: "Trẻ em",
    patient: "Bệnh nhân",
    other: "Khác",
  },
  direction: { up: "Đưa lên căn hộ", down: "Đưa xuống sảnh" },
  frequency: { once: "Một lần", repeat: "Lặp lại" },
  service_id: {
    patrol: "Tuần tra, giám sát",
    access: "Kiểm soát ra vào",
    event: "Bảo vệ sự kiện",
    asset: "Đảm bảo an ninh tài sản",
    other: "Yêu cầu khác",
  },
};

const SKIP_KEYS = new Set([
  "submitted_at",
  "schema_version",
  "dispatched_at",
  "dispatched_by",
  "team",
  "team_id",
  "team_name",
  "auto_assigned",
  "ticket_code",
  "courier_id",
  "option_id",
  "duration_id",
  "weight_id",
  "task_id",
]);

/** Cấu trúc nhóm giống form Family (SecurityServiceScreen). */
export const REQUEST_DETAIL_SECTIONS: Record<string, DetailSection[]> = {
  package: [
    { title: "1. Thông tin nhận hàng", fields: ["address", "recipient_name", "phone"] },
    {
      title: "2. Thông tin đơn hàng",
      fields: ["item_type", "courier", "expected_date", "expected_time_window", "courier_note"],
    },
    { title: "3. Lựa chọn lưu giữ", fields: ["hold_plan", "estimated_cost"] },
    { title: "4. Tuỳ chọn bổ sung", fields: ["notify_on_arrival", "photo_on_receive"] },
  ],
  shipping: [
    { title: "1. Người gửi", fields: ["sender_name", "sender_address", "sender_phone"] },
    { title: "2. Người nhận", fields: ["recipient_name", "recipient_address", "recipient_phone"] },
    {
      title: "3. Đơn vị vận chuyển",
      fields: ["item_type", "weight", "description", "courier_label", "shipping_fee", "estimated_total", "note"],
    },
  ],
  delivery: [
    { title: "1. Thông tin giao hàng", fields: ["item_type", "weight_range", "recipient_name", "recipient_phone", "apartment", "floor_unit", "expected_window", "delivery_note"] },
    { title: "2. Hình thức giao", fields: ["option_label", "delivery_fee", "estimated_total"] },
  ],
  home_care: [
    { title: "1. Thông tin chăm sóc", fields: ["target", "recipient_name", "apartment", "start_date", "start_time", "duration_label", "duration_hours"] },
    { title: "2. Chi tiết yêu cầu", fields: ["tasks", "contact_name", "contact_phone", "health_notes", "base_fee", "estimated_total"] },
  ],
  freight_lift: [
    { title: "1. Thông tin hỗ trợ", fields: ["direction_label", "recipient_name", "apartment", "pickup_location", "dropoff_location"] },
    { title: "2. Lịch hẹn", fields: ["scheduled_date", "scheduled_time", "contact_name", "contact_phone", "estimated_total", "extra_note"] },
  ],
  escort: [
    { title: "1. Thông tin hỗ trợ", fields: ["direction_label", "recipient_name", "recipient_target", "pickup_location", "dropoff_location"] },
    { title: "2. Lịch hẹn", fields: ["scheduled_date", "scheduled_time", "frequency", "contact_name", "contact_phone", "estimated_total", "extra_note"] },
  ],
  remote_freight: [
    { title: "1. Người gửi (xa)", fields: ["sender_name", "sender_phone", "sender_address"] },
    { title: "2. Người nhận tại căn", fields: ["apartment", "recipient_name", "recipient_phone"] },
    { title: "3. Hàng hoá", fields: ["item_type", "weight_label", "item_note", "estimated_total"] },
  ],
  guard_handle: [
    { title: "1. Loại hỗ trợ", fields: ["task_label", "apartment", "desired_time"] },
    { title: "2. Chi tiết", fields: ["description", "estimated_total"] },
  ],
  hourly_guard: [
    { title: "1. Thời gian", fields: ["service_date", "start_time", "end_time", "hours"] },
    { title: "2. Yêu cầu", fields: ["apartment", "description", "guard_count", "estimated_total"] },
  ],
  custom_guard: [
    { title: "1. Dịch vụ", fields: ["service_id", "start_at", "end_at", "apartment"] },
    { title: "2. Chi tiết", fields: ["description", "guard_count", "estimated_total"] },
  ],
  sos: [
    { title: "1. Sự cố khẩn", fields: ["incident_type", "priority", "zone", "location", "note"] },
    { title: "2. Điều động", fields: ["team_name"] },
  ],
  fire: [
    { title: "1. Vị trí", fields: ["building", "apartment"] },
    { title: "2. Mô tả", fields: ["note", "service_group", "service_item"] },
  ],
  intrusion: [
    { title: "1. Vị trí", fields: ["building", "apartment"] },
    { title: "2. Mô tả sự việc", fields: ["note", "service_group", "service_item"] },
  ],
  noise: [
    { title: "1. Vị trí", fields: ["building", "apartment"] },
    { title: "2. Mô tả", fields: ["note"] },
  ],
  other: [
    { title: "1. Vị trí", fields: ["building", "apartment", "address"] },
    { title: "2. Chi tiết yêu cầu", fields: ["service_group", "service_item", "schedule", "note", "description"] },
  ],
};

function humanizeKey(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return value;
  if (digits.startsWith("84") && digits.length >= 11) {
    const local = digits.slice(2);
    return `+84 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`.trim();
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return value;
}

function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value)) {
    const items = value.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
    return items.length ? items.join(", ") : null;
  }
  if (typeof value === "number") {
    if (key.includes("fee") || key.includes("cost") || key.includes("total")) {
      return `${value.toLocaleString("vi-VN")}đ`;
    }
    return String(value);
  }
  if (typeof value === "object") {
    const team = value as { name?: string };
    if (key === "team" && team.name) return team.name;
    return null;
  }
  const str = String(value);
  if (key === "phone" || key.endsWith("_phone")) return formatPhone(str);
  return VALUE_LABELS[key]?.[str] ?? str;
}

function rowForKey(
  key: string,
  payload: Record<string, unknown>,
  request?: { building?: string | null; apartment?: string | null },
): PayloadRow | null {
  let raw: unknown;
  if (key === "building") raw = request?.building ?? payload.building;
  else if (key === "apartment") raw = request?.apartment ?? payload.apartment;
  else if (key === "team_name") {
    const team = payload.team as { name?: string } | undefined;
    raw = payload.team_name ?? team?.name;
  } else if (key === "direction_label") {
    raw = payload.direction_label ?? (payload.direction ? formatValue("direction", payload.direction) : undefined);
  } else {
    raw = payload[key];
  }
  const value = formatValue(key, raw);
  if (!value) return null;
  return { key, label: humanizeKey(key), value };
}

export function buildPayloadDetailSections(
  requestType: string,
  payload: Record<string, unknown> | null | undefined,
  request?: { building?: string | null; apartment?: string | null },
): DetailSectionView[] {
  const p = payload ?? {};
  const layout = REQUEST_DETAIL_SECTIONS[requestType] ?? REQUEST_DETAIL_SECTIONS.other;
  const used = new Set<string>();
  const sections: DetailSectionView[] = [];

  for (const section of layout) {
    const rows: PayloadRow[] = [];
    for (const key of section.fields) {
      const row = rowForKey(key, p, request);
      if (row) {
        rows.push(row);
        used.add(key);
      }
    }
    if (rows.length > 0) sections.push({ title: section.title, rows });
  }

  const extra: PayloadRow[] = [];
  for (const [key, raw] of Object.entries(p)) {
    if (SKIP_KEYS.has(key) || used.has(key)) continue;
    const value = formatValue(key, raw);
    if (value) extra.push({ key, label: humanizeKey(key), value });
  }
  if (extra.length > 0) {
    sections.push({ title: "Thông tin bổ sung", rows: extra });
  }

  return sections;
}

/** @deprecated Dùng buildPayloadDetailSections */
export function buildPayloadDetailRows(payload: Record<string, unknown> | null | undefined): PayloadRow[] {
  return buildPayloadDetailSections("other", payload).flatMap((s) => s.rows);
}
