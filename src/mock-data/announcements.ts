import type { Announcement } from "@/types/core";
import { seedProjects } from "./projects";

const now = Date.now();
const iso = (off: number) => new Date(now + off * 3600_000).toISOString();

const SAMPLES: Array<Pick<Announcement, "title" | "body" | "status" | "channels" | "audience">> = [
  {
    title: "Bảo trì thang máy ngày 25/05",
    body: "Kính gửi cư dân, thang máy số 2 sẽ được bảo trì từ 9h-12h ngày 25/05. Vui lòng dùng thang số 1.",
    status: "sent",
    channels: ["push", "email"],
    audience: { kind: "all_project" },
  },
  {
    title: "Cắt nước khu A từ 22h-6h",
    body: "Để vệ sinh bể chứa, nước sẽ tạm ngưng từ 22h ngày 22/05 đến 6h ngày 23/05.",
    status: "sent",
    channels: ["push", "sms"],
    audience: { kind: "building" },
  },
  {
    title: "Họp cư dân thường niên",
    body: "Mời chủ hộ tham dự họp cư dân lúc 19h ngày 30/05 tại sảnh tầng 1.",
    status: "scheduled",
    channels: ["push", "email"],
    audience: { kind: "all_project" },
  },
  {
    title: "Nhắc nộp phí dịch vụ tháng 5",
    body: "Phí dịch vụ tháng 5 đến hạn ngày 28/05. Vui lòng thanh toán qua VietQR trong app.",
    status: "draft",
    channels: ["push"],
    audience: { kind: "all_project" },
  },
];

export const seedAnnouncements: Announcement[] = seedProjects.slice(0, 3).flatMap((p, pi) =>
  SAMPLES.map((s, i) => ({
    id: `ann-${p.id}-${i}`,
    tenantId: p.tenantId,
    projectId: p.id,
    title: s.title,
    body: s.body,
    channels: s.channels,
    audience: s.audience,
    status: s.status,
    sentAt: s.status === "sent" ? iso(-(24 + i * 6)) : undefined,
    readsCount: s.status === "sent" ? 80 + i * 17 + pi * 5 : 0,
    recipientsCount: 240 + pi * 20,
    authorId: "u-bqlm",
    authorName: "Trần Quốc Anh",
    createdAt: iso(-(48 + i * 12)),
    updatedAt: iso(-(48 + i * 12)),
  })),
);
