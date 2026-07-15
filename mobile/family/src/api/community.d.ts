export type CommunityService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  tag: string | null;
};

export type ServiceBookingRow = {
  id: string;
  service_id: string;
  status: string;
  scheduled_at: string | null;
  notes: string | null;
  created_at: string;
  community_services: { slug: string; name: string; icon: string } | null;
};

export declare function listCommunityServices(): Promise<CommunityService[]>;
export declare function createServiceBooking(data: {
  service_id: string;
  family_id: string;
  contact_phone?: string;
  scheduled_at?: string;
  notes?: string;
}): Promise<{ id: string; status: string; created_at: string }>;
export declare function listMyServiceBookings(): Promise<ServiceBookingRow[]>;
export declare function cancelServiceBooking(data: { id: string }): Promise<{ ok: true }>;
export declare function listCommunityEvents(): Promise<
  Array<{ id: string; title: string; starts_at: string; place: string }>
>;
export declare function registerCommunityEvent(data: {
  event_id: string;
  family_id?: string;
}): Promise<unknown>;
