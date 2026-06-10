import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@mobile/components/Screen";
import { Card } from "@mobile/components/ui";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { SecurityRequestsTracker } from "@mobile/components/security/SecurityRequestsTracker";
import { SecuritySendingOverlay } from "@mobile/components/security/SecuritySendingOverlay";
import {
  getBuildingStatus,
  securityMeta,
  getSecurityServiceCatalog,
  getSecurityServiceGrid,
  getRequestTypeLabel,
  type SecurityCatalogGroup,
  type SecurityGridItem,
} from "@mobile/constants/security";
import { createSecurityRequest } from "@mobile/api/security";
import { toast } from "@mobile/utils/toast";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radius } from "@mobile/theme/colors";

function colorFromKey(
  colors: ReturnType<typeof useTheme>["colors"],
  key: SecurityGridItem["iconColorKey"],
) {
  return colors[key] ?? colors.foreground;
}

function tintFromKey(colors: ReturnType<typeof useTheme>["colors"], key: SecurityGridItem["tintKey"]) {
  return colors[key] ?? colors.tintBlue;
}

export default function BaoAnScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { locale, s } = useI18n();
  const sec = s.security;
  const c = s.common;
  const securityServiceGrid = getSecurityServiceGrid(locale);
  const securityServiceCatalog = getSecurityServiceCatalog(locale);
  const buildingStatus = getBuildingStatus(locale);
  const [pending, setPending] = useState<string | null>(null);
  const [sendingLabel, setSendingLabel] = useState<string | null>(null);
  const styles = useThemedStyles((c, fontScale) => ({
    header: { paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 4 },
    eyebrow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      marginBottom: 4,
    },
    eyebrowText: {
      fontSize: 10 * fontScale,
      fontWeight: "600" as const,
      color: c.success,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    title: { fontSize: 26 * fontScale, fontWeight: "800" as const, color: c.foreground, letterSpacing: -0.5 },
    subtitle: { fontSize: 14 * fontScale, color: c.muted, marginTop: 4 },
    sos: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 16,
      padding: 20,
      borderRadius: radius.xl,
      marginBottom: 4,
    },
    sosIconBox: {
      width: 64,
      height: 64,
      borderRadius: radius.lg,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.3)",
    },
    sosEmoji: { fontSize: 36 },
    sosTitle: { fontSize: 20 * fontScale, fontWeight: "800" as const, color: c.white },
    sosSub: { fontSize: 13 * fontScale, color: "rgba(255,255,255,0.85)", marginTop: 2 },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
      marginBottom: 8,
    },
    gridCard: { padding: 14, marginBottom: 0 },
    gridIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    gridLabel: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, marginTop: 10 },
    gridDesc: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    groupCard: { marginBottom: 10, padding: 0, overflow: "hidden" as const },
    groupHead: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      padding: 14,
    },
    groupIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    groupTitle: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground },
    groupSub: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    groupItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    statusRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 8,
    },
    statusLabel: { fontSize: 14 * fontScale, color: c.muted },
    statusValue: { fontSize: 14 * fontScale, fontWeight: "600" as const },
    dot: { width: 6, height: 6, borderRadius: 3 },
  }));

  const trigger = async (type: string, label: string) => {
    if (pending) return;
    setPending(type);
    setSendingLabel(c.sendingRequest);
    try {
      await createSecurityRequest({ request_type: type });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      setSendingLabel(null);
      toast.success(sec.requestSent(label, securityMeta.responseTimeMinutes));
    } catch (e) {
      setSendingLabel(null);
      toast.error(e instanceof Error ? e.message : c.sendFailed);
    } finally {
      setPending(null);
    }
  };

  const onGridPress = (item: SecurityGridItem) => {
    if (item.action === "chat") {
      router.push("/bao-an/chat");
      return;
    }
    if (item.action === "call") {
      Linking.openURL(`tel:${securityMeta.hotline.replace(/\s/g, "")}`);
      return;
    }
    void trigger(item.requestType, item.label);
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <SecuritySendingOverlay visible={sendingLabel !== null} label={sendingLabel ?? ""} />
      <View style={styles.header}>
        <View style={styles.eyebrow}>
          <ShieldCheck color={colors.success} size={14} />
          <Text style={styles.eyebrowText}>{sec.eyebrow}</Text>
        </View>
        <Text style={styles.title}>{sec.title}</Text>
        <Text style={styles.subtitle}>{sec.subtitle(securityMeta.responseTimeMinutes)}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => trigger("sos", getRequestTypeLabel("sos", locale))}
          disabled={pending === "sos"}
          style={{ marginHorizontal: 16, marginBottom: 4 }}
        >
          <LinearGradient
            colors={[colors.emergency, colors.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sos}
          >
            <View style={styles.sosIconBox}>
              <Text style={styles.sosEmoji}>🆘</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sosTitle}>{pending === "sos" ? sec.sosSending : sec.sosCall}</Text>
              <Text style={styles.sosSub}>{sec.sosTap}</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={{ paddingHorizontal: 16 }}>
          <SecurityRequestsTracker />

          <View style={{ marginTop: 8 }}>
            <SectionHeader title={sec.sendRequestTitle} />
          </View>

          <View style={styles.grid}>
            {securityServiceGrid.map((item) => {
              const Icon = item.icon;
              const iconColor = colorFromKey(colors, item.iconColorKey);
              const tint = tintFromKey(colors, item.tintKey);
              return (
                <Pressable
                  key={item.id}
                  style={{ width: "48%", marginBottom: 10, opacity: pending ? 0.55 : 1 }}
                  disabled={!!pending}
                  onPress={() => onGridPress(item)}
                >
                  <Card style={styles.gridCard}>
                    <View style={[styles.gridIcon, { backgroundColor: tint }]}>
                      <Icon color={iconColor} size={20} />
                    </View>
                    <Text style={styles.gridLabel}>{item.label}</Text>
                    <Text style={styles.gridDesc}>{item.desc}</Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <SectionHeader
            title={sec.catalogTitle}
            subtitle={c.groupCount(securityServiceCatalog.length)}
          />
          {securityServiceCatalog.map((group) => (
            <CatalogGroup
              key={group.id}
              group={group}
              pending={pending}
              onTrigger={trigger}
            />
          ))}

          <SectionHeader title={sec.buildingStatus} />
          <Card>
            {buildingStatus.map((s, i) => (
              <View
                key={s.label}
                style={[
                  styles.statusRow,
                  i < buildingStatus.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
                ]}
              >
                <Text style={styles.statusLabel}>{s.label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: s.ok ? colors.success : colors.warning }]} />
                  <Text style={[styles.statusValue, { color: s.ok ? colors.success : colors.warning }]}>
                    {s.value}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

function CatalogGroup({
  group,
  pending,
  onTrigger,
}: {
  group: SecurityCatalogGroup;
  pending: string | null;
  onTrigger: (type: string, label: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const GroupIcon = group.icon;
  const accent = colorFromKey(colors, group.accentKey);
  const tint = tintFromKey(colors, group.tintKey);
  const styles = useThemedStyles((c, fontScale) => ({
    groupCard: { marginBottom: 10, padding: 0, overflow: "hidden" as const },
    groupHead: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      padding: 14,
    },
    groupIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    groupTitle: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: c.foreground, flex: 1 },
    groupSub: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
    groupItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    itemLabel: { fontSize: 13 * fontScale, fontWeight: "600" as const, color: c.foreground },
    itemDesc: { fontSize: 11 * fontScale, color: c.muted, marginTop: 2 },
  }));

  return (
    <Card style={styles.groupCard}>
      <Pressable style={styles.groupHead} onPress={() => setOpen((o) => !o)}>
        <View style={[styles.groupIcon, { backgroundColor: tint }]}>
          <GroupIcon color={accent} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <Text style={styles.groupSub}>{group.subtitle}</Text>
        </View>
        {open ? (
          <ChevronUp color={colors.muted} size={20} />
        ) : (
          <ChevronDown color={colors.muted} size={20} />
        )}
      </Pressable>
      {open &&
        group.items.map((item) => {
          const ItemIcon = item.icon;
          return (
            <Pressable
              key={item.id}
              style={styles.groupItem}
              disabled={pending === item.requestType}
              onPress={() => onTrigger(item.requestType, item.label)}
            >
              <ItemIcon color={accent} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
            </Pressable>
          );
        })}
    </Card>
  );
}
