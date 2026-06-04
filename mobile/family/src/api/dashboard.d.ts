export type DashboardSummary = {
  expenses_month: { total: number; count: number };
  expenses_prev_month: { total: number };
  member_count: number;
  children: Array<{ id: string; name: string; dob: string | null; today_count: number }>;
  food: { expiring_soon: number; expired: number };
  next_medicine: { medicine: string; member_name: string; time_of_day: string | null } | null;
  next_appointment: { member_name: string; scheduled_at: string } | null;
};

export declare function getDashboard(data: { family_id: string }): Promise<DashboardSummary>;
