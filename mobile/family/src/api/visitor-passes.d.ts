export type VisitorPass = {
  id: string;
  pass_code: string;
  guest_name: string;
  guest_phone: string | null;
  purpose: string | null;
  valid_until: string;
  status: string;
  created_at: string;
};

export declare function listVisitorPasses(data: { family_id: string }): Promise<VisitorPass[]>;
export declare function createVisitorPass(data: {
  family_id: string;
  guest_name: string;
  guest_phone?: string;
  purpose?: string;
  valid_hours?: number;
}): Promise<{ id: string; pass_code: string; guest_name: string; valid_until: string }>;
export declare function revokeVisitorPass(data: { id: string }): Promise<{ ok: boolean }>;
export declare function scanVisitorPass(data: { pass_code: string }): Promise<{
  ok: boolean;
  guest_name: string;
  pass_code: string;
}>;
