import type { AppLocale } from "@mobile/hooks/useAppPrefs";

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

const SERVICE_EN: Record<
  string,
  { name: string; description: string; tag: string | null }
> = {
  farm: { name: "Farm Fresh", description: "Fresh produce to your door", tag: "Promo" },
  cleaning: { name: "Hourly housekeeping", description: "Rated 4.9★", tag: "Popular" },
  repair: { name: "Home repair", description: "On-site within 30 minutes", tag: "Fast" },
  spa: { name: "Home spa", description: "Weekend relaxation", tag: "New" },
  shuttle: { name: "School shuttle", description: "Verified drivers", tag: "Safe" },
  doctor: { name: "Doctor at home", description: "24/7 consultation", tag: "24/7" },
};

export function localizeCommunityService(
  item: CommunityServiceItem,
  locale: AppLocale,
): CommunityServiceItem {
  if (locale !== "en") return item;
  const en = SERVICE_EN[item.slug];
  if (!en) return item;
  return {
    ...item,
    name: en.name,
    description: en.description,
    tag: en.tag ?? item.tag,
  };
}

export function localizeServiceName(
  slug: string | null | undefined,
  name: string | null | undefined,
  locale: AppLocale,
): string {
  if (!slug && !name) return "";
  return localizeCommunityService(
    { id: "", slug: slug ?? "", name: name ?? "", description: "", icon: "", tag: null },
    locale,
  ).name;
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
