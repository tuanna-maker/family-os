import { Pressable, View } from "react-native";
import { useTheme } from "@mobile/theme/themeStore";

export function DotPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (index: number) => void;
}) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  if (totalPages <= 1) return null;

  const active = isDark ? "#FFFFFF" : colors.brand;
  const inactive = isDark ? "rgba(255,255,255,0.28)" : "rgba(99,102,241,0.28)";

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 20 }}>
      {Array.from({ length: totalPages }, (_, i) => (
        <Pressable key={i} onPress={() => onPage(i)} hitSlop={10}>
          <View
            style={{
              width: i === page ? 10 : 8,
              height: i === page ? 10 : 8,
              borderRadius: 999,
              backgroundColor: i === page ? active : inactive,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}
