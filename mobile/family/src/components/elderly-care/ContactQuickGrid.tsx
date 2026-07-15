import { Pressable, Text, View } from "react-native";
import { Phone, ShieldAlert, Siren, Users } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

export type QuickContact = {
  id: string;
  kind: string;
  label: string;
  name: string;
  phone: string;
};

function contactStyle(
  colors: ReturnType<typeof useTheme>["colors"],
  kind: string,
  isSos: boolean,
): { bg: string; iconBg: string; iconColor: string; textColor: string } {
  if (isSos) {
    return {
      bg: colors.emergency,
      iconBg: "rgba(255,255,255,0.9)",
      iconColor: colors.emergency,
      textColor: colors.white,
    };
  }
  if (kind === "security") {
    return { bg: colors.tintOrange, iconBg: colors.card, iconColor: colors.warning, textColor: colors.warning };
  }
  if (kind === "family") {
    return { bg: colors.tintBlue, iconBg: colors.card, iconColor: colors.brand, textColor: colors.brand };
  }
  return { bg: colors.tintGreen, iconBg: colors.card, iconColor: colors.success, textColor: colors.success };
}

export function ContactQuickGrid({
  contacts,
  elderName,
  elderPhone,
  onCall,
}: {
  contacts: QuickContact[];
  elderName: string;
  elderPhone?: string | null;
  onCall: (label: string, phone: string, isSos: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10, marginBottom: 4 },
    btn: {
      width: "47%" as const,
      minHeight: 96,
      padding: 12,
      borderRadius: radius.lg,
      justifyContent: "space-between" as const,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    label: { fontSize: 15, fontWeight: "800" as const },
    sub: { fontSize: 11, marginTop: 4, opacity: 0.85 },
  }));

  return (
    <View style={styles.grid}>
      {contacts.map((c) => {
        const isSos = c.kind === "sos";
        const phone = c.kind === "elder" && elderPhone ? elderPhone : c.phone;
        const cs = contactStyle(colors, c.kind, isSos);
        const Icon: LucideIcon =
          c.kind === "elder" ? Phone : c.kind === "family" ? Users : c.kind === "security" ? ShieldAlert : Siren;
        const subName = c.kind === "elder" ? elderName : c.name;
        return (
          <Pressable
            key={c.id}
            style={[styles.btn, { backgroundColor: cs.bg }]}
            onPress={() => onCall(c.label, phone, isSos)}
          >
            <View style={[styles.iconWrap, { backgroundColor: cs.iconBg }]}>
              <Icon color={cs.iconColor} size={22} />
            </View>
            <View>
              <Text style={[styles.label, { color: cs.textColor }]}>{c.label}</Text>
              <Text style={[styles.sub, { color: cs.textColor }]} numberOfLines={1}>
                {subName}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
