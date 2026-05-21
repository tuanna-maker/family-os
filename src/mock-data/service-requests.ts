import type { ServiceRequest } from "@/types/core";
import { seedResidents } from "./residents";

const now = Date.now();
const iso = (off: number) => new Date(now + off * 3600_000).toISOString();

const SAMPLES: Array<Pick<ServiceRequest, "title" | "description" | "category" | "priority" | "status">> = [
  { title: "Vòi nước bồn rửa bị rò rỉ", description: "Nước nhỏ giọt liên tục từ tối qua, mong BQL hỗ trợ.", category: "technical", priority: "normal", status: "new" },
  { title: "Thang máy phát ra tiếng kêu lạ", description: "Khi thang chạy lên tầng 12 có tiếng cót két.", category: "technical", priority: "high", status: "in_progress" },
  { title: "Rác hành lang chưa được dọn", description: "Khu vực hành lang tầng 8 còn rác từ tối qua.", category: "cleaning", priority: "normal", status: "resolved" },
  { title: "Người lạ đi vào tầng hầm", description: "Camera ghi nhận lúc 23h.", category: "security", priority: "urgent", status: "in_progress" },
  { title: "Sai phí gửi xe tháng này", description: "Hoá đơn tháng 5 ghi 2 xe nhưng nhà chỉ có 1.", category: "billing", priority: "normal", status: "waiting_resident" },
  { title: "Đề xuất lắp thêm camera khu vui chơi", description: "Để an toàn cho trẻ em.", category: "other", priority: "low", status: "new" },
];

const heads = seedResidents.filter((r) => r.isHeadOfHousehold);

export const seedServiceRequests: ServiceRequest[] = heads.slice(0, 18).flatMap((res, i) => {
  const s = SAMPLES[i % SAMPLES.length];
  const createdAt = iso(-(24 + i * 3));
  return [{
    id: `srv-${res.id}-${i}`,
    tenantId: res.tenantId,
    projectId: res.projectId,
    apartmentId: res.apartmentId,
    residentId: res.id,
    residentName: res.fullName,
    title: s.title,
    description: s.description,
    category: s.category,
    priority: s.priority,
    status: s.status,
    assignedStaffName: s.status !== "new" ? "Kỹ thuật viên Tâm" : undefined,
    timeline: [
      { id: `t-${i}-0`, authorId: res.id, authorName: res.fullName, authorRole: "resident", body: "Tạo phản ánh.", at: createdAt },
      ...(s.status !== "new" ? [{
        id: `t-${i}-1`, authorId: "u-bqls", authorName: "Nguyễn Bích Ngọc", authorRole: "bql_staff" as const,
        body: "Đã tiếp nhận và gán kỹ thuật viên.", at: iso(-(20 + i * 3)),
      }] : []),
      ...(s.status === "resolved" ? [{
        id: `t-${i}-2`, authorId: "u-bqls", authorName: "Nguyễn Bích Ngọc", authorRole: "bql_staff" as const,
        body: "Đã xử lý xong, mời cư dân kiểm tra.", at: iso(-(2 + i)),
      }] : []),
    ],
    resolvedAt: s.status === "resolved" ? iso(-(2 + i)) : undefined,
    createdAt,
    updatedAt: createdAt,
  }];
});
