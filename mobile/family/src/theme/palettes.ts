export type AppColors = {
  background: string;
  foreground: string;
  card: string;
  cardBorder: string;
  surface: string;
  surfaceElevated: string;
  muted: string;
  mutedBg: string;
  brand: string;
  brandDeep: string;
  navy: string;
  success: string;
  warning: string;
  emergency: string;
  info: string;
  pink: string;
  tintBlue: string;
  tintPurple: string;
  tintOrange: string;
  tintGreen: string;
  tintRed: string;
  tintPink: string;
  white: string;
};

/** Khớp `apps/family/src/styles.css` — light */
export const lightPalette: AppColors = {
  background: "#F6F8FC",
  foreground: "#0C1B36",
  card: "#FFFFFF",
  cardBorder: "#E7ECF5",
  surface: "#FAFBFE",
  surfaceElevated: "#FFFFFF",
  muted: "#64748B",
  mutedBg: "#F1F5F9",
  brand: "#2563EB",
  brandDeep: "#1D4ED8",
  navy: "#071A3D",
  success: "#22C55E",
  warning: "#F97316",
  emergency: "#EF4444",
  info: "#2563EB",
  pink: "#EC4899",
  tintBlue: "#DBEAFE",
  tintPurple: "#EDE9FE",
  tintOrange: "#FFEDD5",
  tintGreen: "#DCFCE7",
  tintRed: "#FEE2E2",
  tintPink: "#FCE7F3",
  white: "#FFFFFF",
};

/** Dark — tương phản cao, nền sâu, card tách lớp rõ */
export const darkPalette: AppColors = {
  background: "#0B0F17",
  foreground: "#E8EDF5",
  card: "#151C28",
  cardBorder: "rgba(255,255,255,0.10)",
  surface: "#111827",
  surfaceElevated: "#1A2332",
  muted: "#8B9BB5",
  mutedBg: "rgba(255,255,255,0.06)",
  brand: "#5B9CF5",
  brandDeep: "#3B82F6",
  navy: "#E8EDF5",
  success: "#4ADE80",
  warning: "#FB923C",
  emergency: "#F87171",
  info: "#93C5FD",
  pink: "#F472B6",
  tintBlue: "rgba(59,130,246,0.18)",
  tintPurple: "rgba(139,92,246,0.18)",
  tintOrange: "rgba(249,115,22,0.18)",
  tintGreen: "rgba(34,197,94,0.18)",
  tintRed: "rgba(239,68,68,0.18)",
  tintPink: "rgba(236,72,153,0.18)",
  white: "#FFFFFF",
};
