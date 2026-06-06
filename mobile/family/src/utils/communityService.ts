/** Icon mặc định theo slug DB (community_services). */
export const COMMUNITY_SLUG_ICONS: Record<string, string> = {
  farm: "🥬",
  cleaning: "🧹",
  repair: "🔧",
  spa: "💆",
  shuttle: "🚗",
  doctor: "🩺",
};

export type CommunityServiceItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  tag: string | null;
};

export function serviceDisplayIcon(s: CommunityServiceItem): string {
  const raw = (s.icon ?? "").trim();
  if (raw) return raw;
  return COMMUNITY_SLUG_ICONS[s.slug] ?? "🛎️";
}

/** Điều hướng theo slug; null = đặt dịch vụ trực tiếp trên màn Cộng đồng. */
export function communityServiceRoute(slug: string): string | null {
  switch (slug) {
    case "farm":
      return "/thuc-pham";
    case "cleaning":
      return "/quan-ly-giup-viec";
    case "repair":
      return "/dich-vu";
    default:
      return null;
  }
}
