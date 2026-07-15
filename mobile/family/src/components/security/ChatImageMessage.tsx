import { useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ImageLoadEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { radius } from "@mobile/theme/colors";

const SCREEN = Dimensions.get("window");
const FRAME_W = Math.min(SCREEN.width * 0.62, 260);
const FRAME_H = Math.round(FRAME_W * 0.75);

type Props = {
  uri: string;
  mine?: boolean;
};

export function ChatImageMessage({ uri, mine }: Props) {
  const [open, setOpen] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  const onThumbLoad = useCallback((e: ImageLoadEvent) => {
    const { width, height } = e.nativeEvent.source;
    if (width > 0 && height > 0) setNatural({ w: width, h: height });
  }, []);

  const fullSize = (() => {
    if (natural.w <= 0 || natural.h <= 0) {
      return { width: SCREEN.width - 24, height: SCREEN.height * 0.7 };
    }
    const maxW = SCREEN.width - 24;
    const maxH = SCREEN.height - 120;
    const scale = Math.min(maxW / natural.w, maxH / natural.h, 1);
    return { width: natural.w * scale, height: natural.h * scale };
  })();

  return (
    <>
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="imagebutton"
          style={styles.frame}
        >
          <Image
            source={{ uri }}
            style={styles.thumb}
            resizeMode="cover"
            onLoad={onThumbLoad}
          />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <SafeAreaView style={styles.safe}>
            <Image
              source={{ uri }}
              style={fullSize}
              resizeMode="contain"
              onLoad={onThumbLoad}
            />
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    marginBottom: 10,
    flexDirection: "row",
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowTheirs: {
    justifyContent: "flex-start",
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  safe: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
});
