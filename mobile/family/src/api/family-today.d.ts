export type FamilyTodayMember = {
  id: string;
  name: string;
  status: string;
  kind: string;
};

export declare function getFamilyToday(data: { family_id: string }): Promise<{ members: FamilyTodayMember[] }>;
