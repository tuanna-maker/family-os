import { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useLayoutInfo } from "@mobile/hooks/useLayoutInfo";

export function LandscapeContent({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { isLandscape, contentMaxWidth } = useLayoutInfo();

  return (
    <View
      style={[
        { width: "100%" },
        isLandscape ? { maxWidth: contentMaxWidth, alignSelf: "center" as const } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
