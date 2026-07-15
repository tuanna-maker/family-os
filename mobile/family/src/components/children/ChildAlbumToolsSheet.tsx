import { useEffect } from "react";
import {
  BackHandler,
  Modal,
  Pressable,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { ImagePlus, Pencil, Trash2 } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";
import { useI18n } from "@mobile/i18n/useI18n";
import type { ChildAlbum } from "@mobile/api/child-albums";
import {
  ChildAlbumGridCard,
  type ChildAlbumCardAnchor,
} from "@mobile/components/children/ChildAlbumGridCard";

type Props = {
  album: ChildAlbum | null;
  anchor: ChildAlbumCardAnchor | null;
  visible: boolean;
  onClose: () => void;
  onAddPhoto: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const ELEVATE_SCALE = 1.04;
const MENU_GAP = 4;

export function ChildAlbumToolsSheet({
  album,
  anchor,
  visible,
  onClose,
  onAddPhoto,
  onEdit,
  onDelete,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { height: screenH } = useWindowDimensions();
  const { s } = useI18n();
  const ch = s.screens.children;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!album || !anchor) return null;

  const menuW = anchor.width;
  const menuLeft = anchor.x;
  const elevatedBottom = anchor.y + anchor.height * ELEVATE_SCALE;
  const menuH = 156;

  let menuTop = elevatedBottom + MENU_GAP;
  if (menuTop + menuH > screenH - 16) {
    menuTop = anchor.y - menuH - MENU_GAP;
  }

  const items = [
    {
      key: "add",
      label: ch.addMoment,
      icon: ImagePlus,
      color: colors.foreground,
      onPress: () => {
        onClose();
        onAddPhoto();
      },
    },
    {
      key: "edit",
      label: ch.editChildAlbumTitleCover,
      icon: Pencil,
      color: colors.foreground,
      onPress: () => {
        onClose();
        onEdit();
      },
    },
    {
      key: "delete",
      label: ch.deleteChildAlbum,
      icon: Trash2,
      color: colors.emergency,
      destructive: true,
      onPress: () => {
        onClose();
        onDelete();
      },
    },
  ] as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={styles.root}>
          <View
            pointerEvents="none"
            style={[
              styles.elevatedWrap,
              {
                left: anchor.x,
                top: anchor.y,
                width: anchor.width,
                height: anchor.height,
                transform: [{ scale: ELEVATE_SCALE }],
              },
            ]}
          >
            <ChildAlbumGridCard
              album={album}
              width={anchor.width}
              height={anchor.height}
              elevated
            />
          </View>

          <TouchableWithoutFeedback accessible={false}>
            <View style={[styles.menu, { top: menuTop, left: menuLeft, width: menuW }]}>
              {items.map((item, i) => (
                <View key={item.key}>
                  {i === 2 ? <View style={styles.sep} /> : null}
                  <Pressable style={styles.row} onPress={item.onPress}>
                    <item.icon color={item.color} size={18} />
                    <Text style={[styles.rowText, item.destructive && { color: colors.emergency }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    root: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.68)",
    },
    elevatedWrap: {
      position: "absolute" as const,
    },
    menu: {
      position: "absolute" as const,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: "hidden" as const,
      paddingVertical: 4,
      elevation: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    rowText: {
      fontSize: 14 * fontScale,
      fontWeight: "600" as const,
      color: c.foreground,
      flex: 1,
    },
    sep: { height: 1, backgroundColor: c.cardBorder, marginVertical: 2 },
  }));
}
