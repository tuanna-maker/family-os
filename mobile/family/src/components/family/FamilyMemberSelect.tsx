import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Users } from "lucide-react-native";
import { listFamilyMembers, type FamilyMemberRow } from "@mobile/api/family-members";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { FieldLabel } from "@mobile/components/ui";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getLocaleRef } from "@mobile/i18n/localeRef";
import { getStrings } from "@mobile/i18n/useI18n";
import { useI18n } from "@mobile/i18n/useI18n";
import { stripOwnerSuffix } from "@mobile/utils/displayName";

export function memberDisplayName(m: FamilyMemberRow, locale: AppLocale = getLocaleRef()) {
  const fallback = getStrings(locale).common.memberDefault;
  const raw = m.full_name ?? m.username ?? m.email ?? fallback;
  return stripOwnerSuffix(raw) || fallback;
}

function initials(name: string | null, email: string | null) {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  label?: string;
  value: string;
  onChange: (name: string) => void;
};

export function FamilyMemberSelect({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { s } = useI18n();
  const { familyId } = useFamilyContext();
  const fieldLabel = label ?? s.members.selectLabel;
  const { colors } = useTheme();
  const styles = useSelectStyles();

  const q = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => listFamilyMembers({ family_id: familyId! }),
    enabled: !!familyId,
    staleTime: 30_000,
  });

  const members = q.data?.members ?? [];
  const selected = members.find((m) => memberDisplayName(m) === value);

  return (
    <View style={styles.wrap}>
      <FieldLabel>{fieldLabel}</FieldLabel>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        {selected?.avatar_url ? (
          <Image source={{ uri: selected.avatar_url }} style={styles.triggerAvatar} />
        ) : value ? (
          <View style={styles.triggerFallback}>
            <Text style={styles.triggerInitials}>{initials(value, null)}</Text>
          </View>
        ) : (
          <View style={styles.triggerFallback}>
            <Users color={colors.muted} size={16} />
          </View>
        )}
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {value || s.members.selectPlaceholder}
        </Text>
        <ChevronDown color={colors.muted} size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{s.members.selectTitle}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {members.length === 0 ? (
                <Text style={styles.empty}>{s.members.emptyList}</Text>
              ) : (
                members.map((m) => {
                  const name = memberDisplayName(m);
                  const active = value === name;
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.option, active && styles.optionActive]}
                      onPress={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                    >
                      {m.avatar_url ? (
                        <Image source={{ uri: m.avatar_url }} style={styles.optionAvatar} />
                      ) : (
                        <View style={styles.optionFallback}>
                          <Text style={styles.optionInitials}>{initials(m.full_name, m.email)}</Text>
                        </View>
                      )}
                      <Text style={styles.optionName} numberOfLines={1}>
                        {name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function useSelectStyles() {
  return useThemedStyles((c, fontScale) => ({
    wrap: { marginBottom: 14 },
    trigger: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    triggerAvatar: { width: 32, height: 32, borderRadius: 16 },
    triggerFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    triggerInitials: { fontSize: 11 * fontScale, fontWeight: "800" as const, color: c.brand },
    triggerText: { flex: 1, fontSize: 15 * fontScale, fontWeight: "600" as const, color: c.foreground },
    placeholder: { color: c.muted, fontWeight: "500" as const },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end" as const,
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      borderWidth: 1,
      borderColor: c.cardBorder,
      maxHeight: "60%" as const,
    },
    sheetTitle: { fontSize: 17 * fontScale, fontWeight: "800" as const, color: c.foreground, marginBottom: 12 },
    list: { maxHeight: 320 },
    empty: { fontSize: 14 * fontScale, color: c.muted, textAlign: "center" as const, paddingVertical: 24 },
    option: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: radius.lg,
      marginBottom: 4,
    },
    optionActive: { backgroundColor: c.tintBlue },
    optionAvatar: { width: 40, height: 40, borderRadius: 20 },
    optionFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.tintBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    optionInitials: { fontSize: 12 * fontScale, fontWeight: "800" as const, color: c.brand },
    optionName: { flex: 1, fontSize: 15 * fontScale, fontWeight: "600" as const, color: c.foreground },
  }));
}
