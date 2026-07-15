export type AlbumCategory =
  | "Du lịch"
  | "Sinh nhật"
  | "Học tập"
  | "Cuối tuần"
  | "Bữa cơm gia đình"
  | "Ngày đặc biệt";

export const albumCategories: { key: AlbumCategory; emoji: string }[] = [
  { key: "Du lịch", emoji: "✈️" },
  { key: "Sinh nhật", emoji: "🎂" },
  { key: "Học tập", emoji: "🎓" },
  { key: "Cuối tuần", emoji: "🏡" },
  { key: "Bữa cơm gia đình", emoji: "🍱" },
  { key: "Ngày đặc biệt", emoji: "✨" },
];

export function categoryEmoji(category: string) {
  return albumCategories.find((c) => c.key === category)?.emoji ?? "📁";
}
