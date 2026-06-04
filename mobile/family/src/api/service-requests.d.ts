export type FamilyServiceRequest = {
  id: string;
  title: string;
  category: string;
  status: string;
  description: string | null;
  created_at: string;
};

export declare function listMyServiceRequests(data: { family_id: string }): Promise<FamilyServiceRequest[]>;
export declare function createFamilyServiceRequest(data: {
  family_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
}): Promise<{ id: string }>;
