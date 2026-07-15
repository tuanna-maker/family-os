import type { AuditLog } from "@/types/core";

const t = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const seedAuditLogs: AuditLog[] = [
  { id: "log-1", tenantId: null,           actorId: "u-super",  actorName: "Lê Quang Khải",   actorRole: "super_admin",  action: "tenant.create", entityType: "Tenant", entityId: "tnt-greenvalley", createdAt: t(120) },
  { id: "log-2", tenantId: "tnt-sunrise",  actorId: "u-tenant", actorName: "Phan Minh Châu",  actorRole: "tenant_admin", action: "project.edit",  entityType: "Project", entityId: "prj-sunrise-a",  createdAt: t(60) },
  { id: "log-3", tenantId: "tnt-stos",     actorId: "u-bqlm",   actorName: "Trần Quốc Anh",   actorRole: "bql_manager",  action: "resident.approve", entityType: "Resident", entityId: "res-1", createdAt: t(30) },
];
