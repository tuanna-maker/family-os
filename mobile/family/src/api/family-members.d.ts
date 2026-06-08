export type FamilyMemberRow = {
  id: string;
  user_id: string | null;
  role: "family_owner" | "family_member";
  is_owner: boolean;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  member_role: string | null;
  age: number | null;
  joined_at: string | null;
};

export declare function listFamilyMembers(data: {
  family_id: string;
}): Promise<{
  family: { id: string; name: string; owner_id: string };
  members: FamilyMemberRow[];
}>;
