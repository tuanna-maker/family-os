export type SecurityRequest = { id: string; request_type: string; status: string; created_at: string };

export declare function createSecurityRequest(data: {
  request_type: string;
  elderly_id?: string | null;
  apartment?: string | null;
}): Promise<unknown>;
export declare function listSecurityRequests(): Promise<SecurityRequest[]>;
