export declare function listCommunityServices(): Promise<
  Array<{ id: string; slug: string; name: string; description: string; icon: string; tag: string | null }>
>;
export declare function createServiceBooking(data: {
  service_id: string;
  family_id: string;
  contact_phone?: string;
  scheduled_at?: string;
  notes?: string;
}): Promise<{ id: string; status: string; created_at: string }>;
export declare function listCommunityEvents(): Promise<
  Array<{ id: string; title: string; starts_at: string; place: string }>
>;
export declare function registerCommunityEvent(data: { event_id: string; family_id?: string }): Promise<unknown>;
