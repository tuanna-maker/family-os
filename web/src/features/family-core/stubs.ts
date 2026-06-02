// ============================================================
// FAMILY CORE — Nội dung tĩnh cho các màn stub (sức khoẻ, con cái,
// du lịch, thực phẩm). Tách ra để route file gọn, dễ chỉnh nội dung.
// ============================================================

export type StubSection = {
  title: string;
  items: { icon: string; label: string; desc: string }[];
};

export type StubPageData = {
  title: string;
  subtitle: string;
  emoji: string;
  sections: StubSection[];
};

export const stubHealth: StubPageData = {
  title: "Sức khỏe gia đình",
  subtitle: "Hồ sơ, nhắc thuốc, lịch khám",
  emoji: "❤️",
  sections: [
    {
      title: "Tổng quan",
      items: [
        { icon: "📋", label: "Hồ sơ sức khỏe", desc: "6 thành viên • cập nhật tuần trước" },
        { icon: "💊", label: "Nhắc uống thuốc", desc: "3 lời nhắc hôm nay" },
        { icon: "🏥", label: "Lịch khám sắp tới", desc: "Bé Na - khám định kỳ T6" },
        { icon: "🛡️", label: "Bảo hiểm", desc: "5 hợp đồng còn hiệu lực" },
      ],
    },
    {
      title: "Chăm sóc đặc biệt",
      items: [
        { icon: "👵", label: "Sức khỏe ông bà", desc: "Bà Hoa - huyết áp ổn định" },
        { icon: "✨", label: "AI tư vấn sức khỏe", desc: "Hỏi bất cứ điều gì" },
      ],
    },
  ],
};

export const stubChildren: StubPageData = {
  title: "Đồng hành cùng con",
  subtitle: "Bé Minh, Bé Na",
  emoji: "🎒",
  sections: [
    {
      title: "Hôm nay",
      items: [
        { icon: "📚", label: "Bài tập về nhà", desc: "Toán + Tiếng Việt - hoàn thành 2/3" },
        { icon: "🎹", label: "Lớp Piano", desc: "18:00 hôm nay" },
        { icon: "🏆", label: "Thành tích tuần", desc: "3 sao vàng từ giáo viên" },
      ],
    },
    {
      title: "Theo dõi",
      items: [
        { icon: "😊", label: "Cảm xúc bé", desc: "Tuần này: vui vẻ, năng động" },
        { icon: "📈", label: "Tăng trưởng", desc: "Chiều cao, cân nặng đúng chuẩn" },
        { icon: "🎯", label: "Mục tiêu học tập", desc: "Học bơi - tuần 3/8" },
        { icon: "✨", label: "AI nuôi dạy con", desc: "Gợi ý hôm nay" },
      ],
    },
  ],
};

export const stubTravel: StubPageData = {
  title: "Cả nhà du lịch",
  subtitle: "Lên kế hoạch chuyến đi đáng nhớ",
  emoji: "✈️",
  sections: [
    {
      title: "Chuyến đi sắp tới",
      items: [
        { icon: "🏖️", label: "Đà Nẵng - 5N4Đ", desc: "15-19/07 • 6 người" },
        { icon: "✅", label: "Checklist", desc: "Hoàn thành 12/24 mục" },
        { icon: "🎫", label: "Vé máy bay & khách sạn", desc: "Đã đặt" },
      ],
    },
    {
      title: "Hỗ trợ",
      items: [
        { icon: "🧳", label: "Danh sách hành lý", desc: "Theo từng thành viên" },
        { icon: "💰", label: "Ngân sách chuyến đi", desc: "18tr / 25tr dự kiến" },
        { icon: "🌤️", label: "Thời tiết điểm đến", desc: "Nắng đẹp - 30°C" },
        { icon: "✨", label: "AI gợi ý hoạt động", desc: "Phù hợp cả gia đình" },
      ],
    },
  ],
};

export const stubFridge: StubPageData = {
  title: "Thực phẩm & Tủ lạnh",
  subtitle: "Quản lý kho - mua sắm thông minh",
  emoji: "🥗",
  sections: [
    {
      title: "Tủ lạnh nhà bạn",
      items: [
        { icon: "⚠️", label: "Sắp hết hạn", desc: "Sữa tươi (1 ngày), Cá hồi (2 ngày)" },
        { icon: "📦", label: "Tồn kho", desc: "42 mặt hàng" },
        { icon: "🛒", label: "Danh sách mua sắm", desc: "8 món - sẵn sàng đặt Farm Fresh" },
      ],
    },
    {
      title: "Gợi ý AI",
      items: [
        { icon: "🍲", label: "Bữa tối hôm nay", desc: "Canh chua cá hồi + rau luộc" },
        { icon: "📸", label: "Quét mã vạch", desc: "Thêm sản phẩm nhanh" },
      ],
    },
  ],
};
