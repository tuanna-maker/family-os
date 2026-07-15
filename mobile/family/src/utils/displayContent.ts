import type { AppLocale } from "@mobile/hooks/useAppPrefs";

/** Bỏ prefix seed [Pilot] trong tiêu đề album/kỷ niệm. */
export function stripPilotPrefix(raw: string): string {
  return raw.replace(/^\[Pilot\]\s*/i, "").trim();
}

const PILOT_ALBUM_TITLES: Record<string, string> = {
  "Mùa hè 2025": "Summer 2025",
  Test: "Test",
};

export function displayAlbumTitle(raw: string, locale: AppLocale): string {
  const cleaned = stripPilotPrefix(raw);
  if (locale === "en" && PILOT_ALBUM_TITLES[cleaned]) {
    return PILOT_ALBUM_TITLES[cleaned];
  }
  return cleaned || raw;
}

const PILOT_FOOD_EN: Record<string, string> = {
  "Thịt bò": "Beef",
  "Cà chua": "Tomato",
  "Rau muống": "Water spinach",
  "Trứng gà": "Chicken eggs",
  "Sữa tươi": "Fresh milk",
  "Gà ta": "Free-range chicken",
};

const FOOD_UNIT_EN: Record<string, string> = {
  bó: "bundle",
  hộp: "box",
  quả: "pcs",
  con: "whole",
};

export function displayFoodName(raw: string, locale: AppLocale): string {
  const cleaned = stripPilotPrefix(raw);
  if (locale === "en" && PILOT_FOOD_EN[cleaned]) return PILOT_FOOD_EN[cleaned];
  return cleaned || raw;
}

export function displayFoodUnit(raw: string | null | undefined, locale: AppLocale): string {
  if (!raw) return "";
  if (locale !== "en") return raw;
  return FOOD_UNIT_EN[raw] ?? raw;
}

export function displayGrade(raw: string | null | undefined, locale: AppLocale): string {
  if (!raw) return "—";
  if (locale !== "en") return raw;
  const m = raw.match(/^Lớp\s*(\d+)/i);
  if (m) return `Grade ${m[1]}`;
  return raw;
}

const HELPER_ROLE_EN: Record<string, string> = {
  "Giúp việc": "Housekeeper",
};

export function displayHelperRole(raw: string | null | undefined, locale: AppLocale): string {
  if (!raw) return "";
  if (locale === "en" && HELPER_ROLE_EN[raw]) return HELPER_ROLE_EN[raw];
  return raw;
}

const PILOT_TRIP_TITLES: Record<string, string> = {
  "Đà Lạt tháng 7": "Da Lat — July",
};

const PILOT_TRIP_LABELS: Record<string, string> = {
  "Đặt khách sạn": "Book hotel",
  "Đặt vé máy bay": "Book flight tickets",
  "Áo khoác": "Jacket",
  "Ăn uống": "Food & dining",
};

export function displayTripTitle(raw: string, locale: AppLocale): string {
  const cleaned = stripPilotPrefix(raw);
  if (locale === "en" && PILOT_TRIP_TITLES[cleaned]) return PILOT_TRIP_TITLES[cleaned];
  return cleaned || raw;
}

export function displayTripLabel(raw: string, locale: AppLocale): string {
  if (locale === "en" && PILOT_TRIP_LABELS[raw]) return PILOT_TRIP_LABELS[raw];
  return raw;
}
