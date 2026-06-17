import { useCallback, useEffect, useRef } from "react";
import {
  BackHandler,
  FlatList,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
  View,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

export type ChildMomentImage = {
  id: string;
  uri: string;
};

type Props = {
  visible: boolean;
  images: ChildMomentImage[];
  initialIndex: number;
  onClose: () => void;
};

export function ChildMomentImageViewer({ visible, images, initialIndex, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const listRef = useRef<FlatList<ChildMomentImage>>(null);
  const scrollIndexRef = useRef(0);

  const viewportW = width;
  const viewportH = height;

  useEffect(() => {
    if (!visible) return;
    const index = Math.min(Math.max(initialIndex, 0), images.length - 1);
    scrollIndexRef.current = index;
    const t = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: index * viewportW, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [visible, initialIndex, images.length, viewportW]);

  useEffect(() => {
    if (!visible) return;
    listRef.current?.scrollToOffset({
      offset: scrollIndexRef.current * viewportW,
      animated: false,
    });
  }, [visible, viewportW, viewportH]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const renderItem: ListRenderItem<ChildMomentImage> = useCallback(
    ({ item }) => (
      <View style={[styles.slide, { width: viewportW, height: viewportH }]}>
        <Image source={{ uri: item.uri }} style={styles.image} resizeMode="contain" />
      </View>
    ),
    [styles.image, styles.slide, viewportH, viewportW],
  );

  if (!visible || !images.length) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          bounces={images.length > 1}
          showsHorizontalScrollIndicator={false}
          extraData={`${viewportW}x${viewportH}`}
          getItemLayout={(_, i) => ({ length: viewportW, offset: viewportW * i, index: i })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: false,
              });
            }, 0);
          }}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / viewportW);
            if (next >= 0 && next < images.length) scrollIndexRef.current = next;
          }}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />

        <Pressable
          style={[styles.closeBtn, { top: Math.max(insets.top, 12) + 4 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
        >
          <X color="#fff" size={22} />
        </Pressable>
      </View>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles(() => ({
    root: {
      flex: 1,
      backgroundColor: "#000",
    },
    slide: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    image: {
      width: "100%" as const,
      height: "100%" as const,
    },
    closeBtn: {
      position: "absolute" as const,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }));
}
