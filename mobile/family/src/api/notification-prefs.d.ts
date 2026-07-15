export type NotificationPrefs = {
  user_id: string;
  medicine_enabled: boolean;
  parent_reminder_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
};

export declare function getMyPrefs(): Promise<NotificationPrefs>;
export declare function updateMyPrefs(data: {
  medicine_enabled: boolean;
  parent_reminder_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
}): Promise<{ ok: boolean }>;
export declare function listFamilyPrefs(): Promise<{
  members: Array<{ user_id: string; name: string | null; prefs: NotificationPrefs }>;
}>;
