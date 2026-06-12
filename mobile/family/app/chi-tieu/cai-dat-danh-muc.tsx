import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus, Trash2, X } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { DotPagination } from "@mobile/components/ui/DotPagination";
import { CategoryFormModal } from "@mobile/components/expense/CategoryFormModal";
import { appAlert } from "@mobile/utils/alert";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { useExpenseSettings } from "@mobile/hooks/useExpenseSettings";
import type { ExpenseCategoryDef } from "@mobile/lib/expense-settings";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { toast } from "@mobile/utils/toast";

const PER_PAGE = 15;

export default function CaiDatDanhMucScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { s } = useI18n();
  const cs = s.expense.categorySettings;
  const c = s.common;
  const { familyId } = useFamilyContext();
  const { settings, update, saveMut } = useExpenseSettings(familyId);
  const styles = useStyles();

  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategoryDef | null>(null);

  const cats = settings?.categories ?? [];
  const totalPages = Math.max(1, Math.ceil(cats.length / PER_PAGE));
  const visibleCats = useMemo(
    () => cats.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE),
    [cats, page],
  );

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (cat: ExpenseCategoryDef) => {
    setEditing(cat);
    setModalOpen(true);
  };

  const saveCategory = (row: ExpenseCategoryDef) => {
    if (!settings) return;
    update((prev) => {
      const exists = prev.categories.findIndex((x) => x.key === (editing?.key || row.key));
      const next = [...prev.categories];
      if (exists >= 0) next[exists] = row;
      else next.push(row);
      return { ...prev, categories: next };
    });
    setModalOpen(false);
    setEditing(null);
    toast.success(cs.saved);
  };

  const remove = (key: string) => {
    appAlert(cs.deleteTitle, cs.deleteMsg, [
      { text: c.cancel, style: "cancel" },
      {
        text: c.delete,
        style: "destructive",
        onPress: () => {
          update((prev) => ({
            ...prev,
            categories: prev.categories.filter((x) => x.key !== key),
          }));
        },
      },
    ]);
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={24} color={colors.brand} />
        </Pressable>
        <Text style={styles.topTitle}>{cs.title}</Text>
        <Pressable onPress={openNew} hitSlop={8}>
          <Plus size={24} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {visibleCats.map((cat) => (
          <Pressable key={cat.key} style={styles.row} onPress={() => openEdit(cat)}>
            <Text style={styles.rowIcon}>{cat.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{cat.labelVi}</Text>
              <Text style={styles.rowSub}>{cat.labelEn}</Text>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                remove(cat.key);
              }}
              hitSlop={8}
            >
              <Trash2 size={18} color={colors.muted} />
            </Pressable>
          </Pressable>
        ))}

        {cats.length > PER_PAGE ? (
          <DotPagination page={page} totalPages={totalPages} onPage={setPage} />
        ) : null}
      </ScrollView>

      <CategoryFormModal
        visible={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={saveCategory}
        loading={saveMut.isPending}
      />
    </Screen>
  );
}

function useStyles() {
  return useThemedStyles((c, fontScale) => ({
    topBar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      paddingTop: 52,
      paddingBottom: 8,
    },
    topTitle: { fontSize: 16 * fontScale, fontWeight: "700" as const, color: c.foreground },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    rowIcon: { fontSize: 22 },
    rowName: { fontSize: 15 * fontScale, fontWeight: "600" as const, color: c.foreground },
    rowSub: { fontSize: 12 * fontScale, color: c.muted, marginTop: 2 },
  }));
}
