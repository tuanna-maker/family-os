export type SecurityRequest = { id: string; request_type: string; status: string; created_at: string };

export type SecurityTone = "success" | "warning" | "emergency" | "muted";

export type SecurityChip = {
  key: "camera" | "fire" | "elevator" | "intrusion" | "package" | "tech";
  label: string;
  value: string;
  tone: SecurityTone;
  count: number;
};

export type SecurityStatus = {
  overall: SecurityTone;
  headline: string;
  subline: string;
  updated_at: string | null;
  open_count: number;
  chips: SecurityChip[];
};

export declare function createSecurityRequest(data: {
  request_type: string;
  elderly_id?: string | null;
  apartment?: string | null;
  building?: string | null;
  payload?: Record<string, unknown>;
}): Promise<{ id: string }>;
export declare function attachSecurityRequestEvidence(data: {
  id: string;
  files: { path: string; name: string; size: number; mime: string }[];
  note?: string;
}): Promise<{ ok: true }>;
export declare function cancelSecurityRequest(data: { id: string }): Promise<unknown>;
export type SecurityRequestList = {
  rows: SecurityRequest[];
  total: number;
  limit: number;
  offset: number;
};

export declare function listSecurityRequests(data?: {
  limit?: number;
  offset?: number;
}): Promise<SecurityRequestList>;
export declare function getSecurityStatus(data: { family_id: string }): Promise<SecurityStatus>;
