import { useMemo } from "react";
import { Text, View } from "react-native";
import { HealthSubScreen } from "@mobile/components/health/HealthSubScreen";
import { HealthRecordTiles } from "@mobile/components/health/HealthRecordTiles";
import { avatarFor } from "@mobile/components/health/healthVisuals";
import { useHealthOverview } from "@mobile/hooks/useHealthOverview";
import { useHealthMutations } from "@mobile/hooks/useHealthMutations";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";
import { formatDate } from "@mobile/i18n/format";
import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import type { I18nStrings } from "@mobile/i18n/strings";

const BACK = "/suc-khoe/ho-so";

type ProfileLike = {
  id?: string;
  name: string;
  dob?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  conditions?: string | null;
};

function profileDetails(p: ProfileLike, sp: I18nStrings["screens"]["health"]["subpage"], locale: AppLocale) {
  const lines: string[] = [];
  if (p.blood_type) lines.push(sp.bloodTypeLabel(p.blood_type));
  if (p.allergies?.trim()) lines.push(sp.allergyLabel(p.allergies.trim()));
  if (p.conditions?.trim()) lines.push(sp.chronicLabel(p.conditions.trim()));
  if (p.dob) lines.push(sp.dobLabel(formatDate(p.dob, locale)));
  if (lines.length === 0) lines.push(sp.noProfileDetail);
  return lines;
}

function openProfileEdit(
  openForm: ReturnType<typeof useHealthMutations>["openForm"],
  p: ProfileLike,
) {
  openForm({
    type: "profile",
    id: p.id,
    profileId: p.id,
    memberName: p.name,
    bloodType: p.blood_type ?? "",
    allergies: p.allergies ?? "",
    conditions: p.conditions ?? "",
  });
}

export default function HoSoSucKhoeScreen() {
  const styles = useHintStyles();
  const { locale, s } = useI18n();
  const h = s.screens.health;
  const sp = h.subpage;
  const { isLoading, profiles, usingPilot, meds, appts, records, allergies, conditions } =
    useHealthOverview();
  const { openForm, deleteRow, isPersistedHealthId } = useHealthMutations(BACK);

  const recordCounts = useMemo(
    () => ({
      tests: records.length || (usingPilot ? 2 : 0),
      meds: meds.length,
      appts: appts.length,
      allergies: allergies.length,
      conditions: conditions.length,
    }),
    [records.length, usingPilot, meds.length, appts.length, allergies.length, conditions.length],
  );

  return (
    <HealthSubScreen
      title={h.profile}
      subtitle={sp.profileSub}
      back="/suc-khoe"
      loading={isLoading && profiles.length === 0}
      actionLabel={h.addProfile}
      onAction={() => openForm({ type: "profile" })}
      emptyTitle={h.noProfile}
      emptyDescription={h.noProfileDesc}
      children={
        <View style={styles.categories}>
          <Text style={styles.sectionTitle}>{sp.profileCategories}</Text>
          <HealthRecordTiles counts={recordCounts} />
        </View>
      }
      items={profiles.map((p) => ({
        id: p.id ?? p.name,
        emoji: avatarFor(p.name),
        title: p.name,
        details: profileDetails(p, sp, locale),
        onPress: () => openProfileEdit(openForm, p),
        onDelete: p.id && isPersistedHealthId(p.id)
          ? () => deleteRow({ table: "health_profiles", id: p.id })
          : undefined,
        deleteLabel: p.name,
      }))}
      footer={
        usingPilot ? (
          <Text style={styles.hint}>{sp.profilePilotHint}</Text>
        ) : null
      }
    />
  );
}

function useHintStyles() {
  return useThemedStyles((c, fontScale) => ({
    categories: { marginBottom: 16 },
    sectionTitle: { fontSize: 15 * fontScale, fontWeight: "800" as const, color: c.foreground, marginBottom: 10 },
    hint: {
      fontSize: 11 * fontScale,
      color: c.muted,
      textAlign: "center" as const,
      marginTop: 12,
      fontStyle: "italic" as const,
    },
  }));
}
