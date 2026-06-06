export type MemberKind = "elderly" | "child" | "adult";
export type StatusTone = "success" | "warning" | "info" | "muted" | "emergency";

export type FamilyTodayMember = {
  id: string;
  kind: MemberKind;
  name: string;
  avatar: string | null;
  role: string | null;
  status: string;
  tone: StatusTone;
  detail: string | null;
  due_at: string | null;
};

export declare function getFamilyToday(data: { family_id: string }): Promise<{ members: FamilyTodayMember[] }>;
