import { View, Text } from "react-native";
import { Image } from "expo-image";

export function UserAvatar({
  uri,
  initial,
  size = 48,
}: {
  uri?: string | null;
  initial: string;
  size?: number;
}) {
  const letter = (initial || "?").slice(0, 1).toUpperCase();

  if (uri?.trim()) {
    return (
      <Image
        source={{ uri: uri.trim() }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      className="bg-brand/15 items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="text-brand font-bold" style={{ fontSize: Math.round(size * 0.38) }}>
        {letter}
      </Text>
    </View>
  );
}
