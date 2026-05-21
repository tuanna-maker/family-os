import type { Tenant } from "@/types/core";

const now = new Date().toISOString();

export const seedTenants: Tenant[] = [
  {
    id: "tnt-stos",
    code: "stos-vn",
    name: "STOS Việt Nam",
    plan: "enterprise",
    status: "active",
    contactEmail: "ops@stoslife.vn",
    contactPhone: "028 7300 0001",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tnt-sunrise",
    code: "sunrise-city",
    name: "Sunrise City Holdings",
    plan: "pro",
    status: "active",
    contactEmail: "admin@sunrise.vn",
    contactPhone: "024 3936 1234",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "tnt-greenvalley",
    code: "green-valley",
    name: "Green Valley Group",
    plan: "starter",
    status: "pending",
    contactEmail: "hello@greenvalley.vn",
    createdAt: now,
    updatedAt: now,
  },
];
