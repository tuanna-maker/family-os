export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export declare function listNotifications(data: {
  limit?: number;
  offset?: number;
  only_unread?: boolean;
}): Promise<{ rows: NotificationRow[]; total: number }>;
export declare function markRead(data: { id: string }): Promise<{ ok: boolean }>;
export declare function markAllRead(): Promise<{ ok: boolean }>;
export declare function unreadCount(): Promise<{ count: number }>;
