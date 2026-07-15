import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type ListRenderItem,
} from "react-native";
import { Card } from "@mobile/components/ui";
import { DotPagination } from "@mobile/components/ui/DotPagination";
import type { SecurityGridItem } from "@mobile/constants/security";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

const GAP = 10;
const PAGE_HEIGHT = 272;
const PER_PAGE = 4;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type Props = {
  items: SecurityGridItem[];
  disabled?: boolean;
  onPress: (item: SecurityGridItem) => void;
  colorFromKey: (key: SecurityGridItem["iconColorKey"]) => string;
  tintFromKey: (key: SecurityGridItem["tintKey"]) => string;
};

export function SecurityServiceGridPager({ items, disabled, onPress, colorFromKey, tintFromKey }: Props) {
  const styles = useStyles();
  const [pageWidth, setPageWidth] = useState(0);
  const halfCardWidth = pageWidth > 0 ? Math.floor((pageWidth - GAP) / 2) : 0;

  const pages = useMemo(() => {
    const out: SecurityGridItem[][] = [];
    for (let i = 0; i < items.length; i += PER_PAGE) out.push(items.slice(i, i + PER_PAGE));
    return out.length ? out : [[]];
  }, [items]);

  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<SecurityGridItem[]>>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== pageWidth) setPageWidth(w);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (next !== page) setPage(next);
  };

  const renderCard = (item: SecurityGridItem, rowSize: number) => {
    const Icon = item.icon;
    const iconColor = colorFromKey(item.iconColorKey);
    const tint = tintFromKey(item.tintKey);
    return (
      <Pressable
        key={item.id}
        style={[
          { opacity: disabled ? 0.55 : 1 },
          rowSize === 1 ? { width: halfCardWidth } : { flex: 1, minWidth: 0 },
        ]}
        disabled={disabled}
        onPress={() => onPress(item)}
      >
        <Card style={styles.gridCard}>
          <View style={[styles.gridIcon, { backgroundColor: tint }]}>
            <Icon color={iconColor} size={20} />
          </View>
          <Text style={styles.gridLabel}>{item.label}</Text>
          <Text style={styles.gridDesc} numberOfLines={2}>
            {item.desc}
          </Text>
        </Card>
      </Pressable>
    );
  };

  const renderPage: ListRenderItem<SecurityGridItem[]> = ({ item: pageItems }) => (
    <View style={[styles.page, { width: pageWidth, height: PAGE_HEIGHT }]}>
      {chunk(pageItems, 2).map((row, ri) => (
        <View key={ri} style={[styles.row, ri > 0 && { marginTop: GAP }]}>
          {row.map((item) => renderCard(item, row.length))}
        </View>
      ))}
    </View>
  );

  return (
    <View onLayout={onLayout}>
      {pageWidth > 0 ? (
        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          decelerationRate="fast"
          snapToInterval={pageWidth}
          snapToAlignment="start"
          bounces={false}
          style={{ height: PAGE_HEIGHT }}
        />
      ) : (
        <View style={{ height: PAGE_HEIGHT }} />
      )}
      {pages.length > 1 && pageWidth > 0 ? (
        <DotPagination
          page={page}
          totalPages={pages.length}
          onPage={(i) => {
            setPage(i);
            listRef.current?.scrollToOffset({ offset: i * pageWidth, animated: true });
          }}
        />
      ) : null}
    </View>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    page: {
      alignItems: "flex-start" as const,
      justifyContent: "flex-start" as const,
    },
    row: {
      flexDirection: "row" as const,
      gap: GAP,
      width: "100%" as const,
    },
    gridCard: { padding: 14, marginBottom: 0, minHeight: 118 },
    gridIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    gridLabel: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, marginTop: 10 },
    gridDesc: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
  }));
}
