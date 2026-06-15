import { useWindowDimensions } from "react-native";

const LANDSCAPE_MAX_CONTENT_WIDTH = 720;

export function useLayoutInfo() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const contentMaxWidth = isLandscape ? Math.min(width, LANDSCAPE_MAX_CONTENT_WIDTH) : width;

  return {
    width,
    height,
    isLandscape,
    contentMaxWidth,
  };
}
