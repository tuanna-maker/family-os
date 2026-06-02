// Core domain types for STOS Life Platform (mock layer).
// Mirror Supabase schema so swapping to real DB is a name-for-name move.

export type Role =
  // Platform Console
  | "super_admin"
  | "platform_ops"
  | "billing_admin"
  | "support"
  | "auditor"
  | "tenant_admin"
  // Community Operations
  | "bql_manager"
  | "bql_staff"
  | "receptionist"
  | "ops_staff"
  | "tech_staff"
  | "finance_staff"
  // Security Operations
  | "security_director"
  | "security_supervisor"
  | "guard_captain"
  | "security_guard"
  | "patrol"
  // Resident Services
  | "head_of_household"
  | "resident"
  | "household_member"
  | "helper";

export type Permission =
  // Master data
  | "tenant.view" | "tenant.create" | "tenant.edit" | "tenant.delete"
  | "project.view" | "project.create" | "project.edit" | "project.delete"
  | "building.view" | "building.create" | "building.edit" | "building.delete"
  | "apartment.view" | "apartment.create" | "apartment.edit" | "apartment.delete"
  | "resident.view" | "resident.create" | "resident.edit" | "resident.delete" | "resident.approve"
  | "staff.view" | "staff.create" | "staff.edit" | "staff.delete"
  | "family.view" | "family.create" | "family.edit" | "family.delete"
  // Operations
  | "service_request.view" | "service_request.create" | "service_request.assign" | "service_request.resolve"
  | "incident.view" | "incident.resolve"
  | "visitor.view" | "visitor.create" | "visitor.approve" | "visitor.scan"
  | "announcement.view" | "announcement.create" | "announcement.send"
  | "fee.view" | "fee.create" | "fee.edit"
  | "payment.view" | "payment.create"
  // Governance
  | "role.view" | "role.assign"
  | "audit.view"
  | "billing.view" | "billing.collect";

export type Status = "active" | "inactive" | "pending" | "suspended" | "archived";

export interface AuditableEntity {
  id: string;
  tenantId: string;            // multi-tenant isolation field
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  code: string;                // SUB-DOMAIN-LIKE slug
  name: string;
  plan: "starter" | "pro" | "enterprise";
  status: Status;
  contactEmail: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
  // counts derived elsewhere
}

export interface Project extends AuditableEntity {
  code: string;
  name: string;
  city: string;
  address: string;
  status: Status;
  managerName?: string;
}

export interface Building extends AuditableEntity {
  projectId: string;
  code: string;                // "A", "B", "C"
  name: string;
  floors: number;
  status: Status;
}

export interface Block extends AuditableEntity {
  projectId: string;
  buildingId: string;
  code: string;
  name: string;
}

export interface Floor extends AuditableEntity {
  buildingId: string;
  blockId?: string;
  number: number;              // 1..N
  apartmentsCount: number;
}

export type ApartmentStatus = "occupied" | "vacant" | "maintenance" | "reserved";

export interface Apartment extends AuditableEntity {
  projectId: string;
  buildingId: string;
  floorId: string;
  code: string;                // "A-15-02"
  type: "1BR" | "2BR" | "3BR" | "Studio" | "Penthouse";
  areaSqm: number;
  status: ApartmentStatus;
  ownerResidentId?: string;
}

export type ResidentRelationship = "owner" | "tenant" | "family";
export type ResidentStatus = "active" | "pending" | "moved_out" | "rejected";

export interface Resident extends AuditableEntity {
  apartmentId: string;
  projectId: string;
  fullName: string;
  phone: string;
  email?: string;
  idNumber?: string;
  relationship: ResidentRelationship;
  isHeadOfHousehold: boolean;
  status: ResidentStatus;
  moveInDate?: string;
}

export type StaffPosition =
  | "bql_manager"
  | "bql_staff"
  | "security_guard"
  | "technician"
  | "accountant"
  | "receptionist";

export interface Staff extends AuditableEntity {
  projectId: string;
  fullName: string;
  phone: string;
  email?: string;
  position: StaffPosition;
  shift?: "morning" | "afternoon" | "night";
  status: Status;
  hireDate?: string;
}

export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  scope: "platform" | "tenant" | "project" | "apartment";
  permissions: Permission[];
}

export interface AuditLog {
  id: string;
  tenantId: string | null;     // null = platform-level
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;              // e.g. "tenant.create"
  entityType: string;
  entityId: string;
  diff?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  tenantId: string | null;     // super_admin = null
  projectIds?: string[];       // optional project scope
  apartmentId?: string;        // for residents
}

// ============================================================
// MVP Business Modules
// ============================================================

// --- Family / Household ---
export type FamilyMemberRole =
  | "head" | "spouse" | "child" | "parent" | "relative"
  | "delegate" | "helper" | "emergency_contact";

export interface Family extends AuditableEntity {
  apartmentId: string;
  projectId: string;
  name: string;                       // e.g. "Gia đình anh An"
  headResidentId?: string;
  note?: string;
}

export interface FamilyMember extends AuditableEntity {
  familyId: string;
  apartmentId: string;
  projectId: string;
  fullName: string;
  phone?: string;
  role: FamilyMemberRole;
  idNumber?: string;
  relationship?: string;              // free text: "Con trai"
  isEmergencyContact: boolean;
}

// --- Visitor / QR ---
export type VisitorStatus = "pending" | "active" | "used" | "expired" | "cancelled";
export type VisitorPurpose = "guest" | "delivery" | "service" | "family" | "other";

export interface Visitor extends AuditableEntity {
  apartmentId: string;
  projectId: string;
  hostResidentId: string;
  hostName: string;
  visitorName: string;
  visitorPhone?: string;
  vehiclePlate?: string;
  purpose: VisitorPurpose;
  qrCode: string;                     // mock token
  validFrom: string;
  validTo: string;
  status: VisitorStatus;
  note?: string;
}

export interface AccessLog {
  id: string;
  tenantId: string;
  projectId: string;
  visitorId?: string;
  residentId?: string;
  apartmentId?: string;
  gate: string;                       // "Cổng A", "Hầm B1"
  direction: "in" | "out";
  scannedBy?: string;                 // guard staffId
  scannedByName?: string;
  at: string;
  note?: string;
}

// --- Service Request / Phản ánh ---
export type ServiceRequestCategory =
  | "technical" | "cleaning" | "security" | "billing" | "other";
export type ServiceRequestStatus =
  | "new" | "in_progress" | "waiting_resident" | "resolved" | "closed";
export type ServiceRequestPriority = "low" | "normal" | "high" | "urgent";

export interface ServiceRequestNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  at: string;
}

export interface ServiceRequest extends AuditableEntity {
  projectId: string;
  apartmentId?: string;
  residentId?: string;
  residentName?: string;
  title: string;
  description: string;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  timeline: ServiceRequestNote[];
  resolvedAt?: string;
}

// --- Announcement ---
export type AnnouncementChannel = "push" | "email" | "sms";
export type AnnouncementAudienceKind =
  | "all_project" | "building" | "floor" | "apartment" | "group";
export type AnnouncementStatus = "draft" | "scheduled" | "sent";

export interface AnnouncementAudience {
  kind: AnnouncementAudienceKind;
  buildingIds?: string[];
  floorIds?: string[];
  apartmentIds?: string[];
  groupTag?: string;
}

export interface Announcement extends AuditableEntity {
  projectId: string;
  title: string;
  body: string;
  channels: AnnouncementChannel[];
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  sentAt?: string;
  readsCount: number;
  recipientsCount: number;
  authorId: string;
  authorName: string;
}

// --- Fee & Payment ---
export type FeeType =
  | "management" | "parking" | "electricity" | "water" | "internet" | "other";
export type FeeStatus = "unpaid" | "partial" | "paid" | "overdue" | "waived";
export type PaymentMethod = "cash" | "bank_transfer" | "vietqr" | "card" | "wallet";

export interface Fee extends AuditableEntity {
  projectId: string;
  apartmentId: string;
  type: FeeType;
  period: string;                     // "2026-05"
  amount: number;                     // VND
  paidAmount: number;
  dueDate: string;
  status: FeeStatus;
  note?: string;
}

export interface Payment extends AuditableEntity {
  projectId: string;
  apartmentId: string;
  feeId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt: string;
  receivedBy?: string;
  receiptNo: string;
}

// --- Resident change history ---
export interface ResidentChange {
  id: string;
  tenantId: string;
  residentId: string;
  apartmentId: string;
  actorId: string;
  actorName: string;
  action: "verified" | "rejected" | "updated" | "moved_in" | "moved_out" | "created";
  note?: string;
  at: string;
}

