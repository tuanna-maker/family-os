export type HelperRow = {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  avatar: string;
  salary: number;
};

export declare function listHelpers(data: { family_id: string }): Promise<HelperRow[]>;
export declare function getHelperBundle(data: { helper_id: string }): Promise<{
  tasks: Array<{ id: string; title: string; time: string; done: boolean }>;
  attendance: Array<{ id: string; att_date: string; status: string }>;
}>;
export declare function upsertHelper(data: unknown): Promise<{ ok: boolean }>;
export declare function upsertHelperTask(data: unknown): Promise<{ ok: boolean }>;
export declare function toggleHelperTask(data: { id: string; done: boolean }): Promise<{ ok: boolean }>;
export declare function setHelperAttendance(data: unknown): Promise<{ ok: boolean }>;
export declare function issueHelperShiftToken(data: { helper_id: string; kind: string }): Promise<{ token: string }>;
