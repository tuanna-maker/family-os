import type { Project } from "@/types/core";

const now = new Date().toISOString();
const base = { createdAt: now, updatedAt: now };

export const seedProjects: Project[] = [
  { id: "prj-stos-park",   tenantId: "tnt-stos",        code: "STOS-PARK",  name: "STOS Park Residence", city: "TP. Hồ Chí Minh", address: "12 Nguyễn Hữu Cảnh, Q.1", status: "active",   managerName: "Trần Quốc Anh", ...base },
  { id: "prj-stos-tower",  tenantId: "tnt-stos",        code: "STOS-TWR",   name: "STOS Tower",          city: "TP. Hồ Chí Minh", address: "88 Tôn Đức Thắng, Q.1",   status: "active",   managerName: "Nguyễn Phương Linh", ...base },
  { id: "prj-sunrise-a",   tenantId: "tnt-sunrise",     code: "SR-A",       name: "Sunrise A",           city: "Hà Nội",           address: "27 Cầu Giấy, Cầu Giấy",   status: "active",   managerName: "Phạm Minh Tuấn", ...base },
  { id: "prj-sunrise-b",   tenantId: "tnt-sunrise",     code: "SR-B",       name: "Sunrise Riverside",   city: "Hà Nội",           address: "15 Long Biên",            status: "active",   managerName: "Lê Hoàng Yến",   ...base },
  { id: "prj-green-pearl", tenantId: "tnt-greenvalley", code: "GV-PEARL",   name: "Green Pearl",         city: "Đà Nẵng",          address: "Số 9 Bạch Đằng",          status: "pending",  ...base },
];
