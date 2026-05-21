// ============================================================
// COMMUNITY — Dịch vụ & sự kiện cộng đồng cư dân.
// ============================================================

export type CommunityService = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tag: string;
};

export const communityServices: CommunityService[] = [
  { id: "farm", name: "Farm Fresh", desc: "Rau sạch tận cửa", icon: "🥬", tag: "Khuyến mãi" },
  { id: "cleaning", name: "Giúp việc theo giờ", desc: "Đánh giá 4.9★", icon: "🧹", tag: "Phổ biến" },
  { id: "repair", name: "Sửa chữa tại nhà", desc: "Có mặt trong 30 phút", icon: "🔧", tag: "Nhanh" },
  { id: "spa", name: "Spa tại gia", desc: "Thư giãn cuối tuần", icon: "💆", tag: "Mới" },
  { id: "shuttle", name: "Đưa đón con", desc: "Tài xế xác thực", icon: "🚗", tag: "An toàn" },
  { id: "doctor", name: "Bác sĩ tại nhà", desc: "Tư vấn 24/7", icon: "🩺", tag: "24/7" },
];

export type CommunityEvent = {
  id: string;
  name: string;
  time: string;
  place: string;
};

export const communityEvents: CommunityEvent[] = [
  { id: "fair", name: "Hội chợ cuối tuần", time: "T7, 20/06 • 17:00", place: "Sân vườn tầng 5" },
  { id: "yoga", name: "Lớp Yoga gia đình", time: "CN, 21/06 • 08:00", place: "Phòng sinh hoạt cộng đồng" },
];
