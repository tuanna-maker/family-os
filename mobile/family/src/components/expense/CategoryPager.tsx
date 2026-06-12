import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  View,
  type LayoutChangeEvent,
  type ListRenderItem,
} from "react-native";
import { DotPagination } from "@mobile/components/ui/DotPagination";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export type CategoryPagerItem = {
  key: string;
  icon: string;
  label: string;
  amount: string;
};

type Props = {
  items: CategoryPagerItem[];
  perPage?: number;
};

const GAP = 8;
const PAGE_HEIGHT = 132;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function CategoryPager({ items, perPage = 4 }: Props) {
  const styles = useStyles();
  const [pageWidth, setPageWidth] = useState(0);
  const halfCardWidth = pageWidth > 0 ? Math.floor((pageWidth - GAP) / 2) : 0;

  const pages = useMemo(() => {
    const out: CategoryPagerItem[][] = [];
    for (let i = 0; i < items.length; i += perPage) {
      out.push(items.slice(i, i + perPage));
    }
    return out.length ? out : [[]];
  }, [items, perPage]);
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<CategoryPagerItem[]>>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== pageWidth) setPageWidth(w);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / pageWidth);
    if (next !== page) setPage(next);
  };

  const renderCard = (cat: CategoryPagerItem, rowSize: number) => (
    <View
      key={cat.key}
      style={[
        styles.card,
        rowSize === 1 ? { width: halfCardWidth } : { flex: 1, minWidth: 0 },
      ]}
    >
      <Text style={styles.emoji}>{cat.icon}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {cat.label}
      </Text>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
        {cat.amount}
      </Text>
    </View>
  );

  const renderPage: ListRenderItem<CategoryPagerItem[]> = ({ item: pageItems }) => (
    <View style={[styles.page, { width: pageWidth, height: PAGE_HEIGHT }]}>
      {chunk(pageItems, 2).map((row, ri) => (
        <View key={ri} style={[styles.row, ri > 0 && { marginTop: GAP }]}>
          {row.map((cat) => renderCard(cat, row.length))}
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
      {pageWidth > 0 ? (
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
    card: {
      height: 62,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 8,
      paddingVertical: 6,
      justifyContent: "center" as const,
      overflow: "hidden" as const,
    },
    emoji: { fontSize: 16, lineHeight: 18 },
    name: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    amount: { fontSize: 12 * fontScale, fontWeight: "800" as const, color: c.foreground, marginTop: 1 },
  }));
}
