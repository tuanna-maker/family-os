export type HouseholdInviteRow = {
  id: string;
  token: string;
  role: string;
  invited_email: string | null;
  invited_phone: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type FamilyQuotaRow = {
  household_id: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  members_count: number;
  members_limit: number;
  notifications_month: number;
  notifications_limit: number;
};

export declare function inviteWebUrl(token: string): string;
export declare function listHouseholdInvites(data: {
  household_id: string;
}): Promise<HouseholdInviteRow[]>;
export declare function getFamilyQuota(data: {
  household_id: string;
}): Promise<FamilyQuotaRow | null>;
export declare function createHouseholdInvite(data: {
  household_id: string;
  invited_email?: string;
  invited_phone?: string;
  expires_in_days?: number;
  role?: "family_owner" | "family_member";
}): Promise<{
  invite_id: string;
  token: string;
  expires_at: string;
  web_url: string;
  deep_link: string;
}>;
export declare function revokeHouseholdInvite(data: { invite_id: string }): Promise<{ ok: true }>;
