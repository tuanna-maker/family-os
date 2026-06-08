import { useEffect, useState, type ReactNode } from "react";
import { Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Moon, Pill, Type } from "lucide-react-native";
import { useAppPrefs } from "@mobile/hooks/useAppPrefs";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton } from "@mobile/components/ui";
import { TimeField } from "@mobile/components/DateTimeField";
import { SectionHeader } from "@mobile/components/SectionHeader";
import { ErrorState, LoadingState } from "@mobile/components/states";
import {
  getMyPrefs,
  listFamilyPrefs,
  updateMyPrefs,
  type NotificationPrefs,
} from "@mobile/api/notification-prefs";
import { toast } from "@mobile/utils/toast";
import { radius } from "@mobile/theme/colors";

export default function CaiDatThongBaoScreen() {
  const { theme, easyRead, setTheme, setEasyRead } = useAppPrefs();
  const { colors } = useTheme();
  const { s } = useI18n();
  const st = s.settings;
  const pf = st.prefs;
  const styles = useSettingsStyles();
  const me = useQuery({ queryKey: ["np", "me"], queryFn: () => getMyPrefs() });
  const fam = useQuery({ queryKey: ["np", "family"], queryFn: () => listFamilyPrefs() });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={st.notifications.eyebrow} title={pf.notifDisplayTitle} back="/(tabs)/tai-khoan" />

      <Card style={{ marginBottom: 16 }}>
        <PrefRow
          styles={styles}
          icon={<Moon size={18} color={colors.brand} />}
          title={s.account.darkMode}
          desc={pf.darkModeDesc}
          value={theme === "dark"}
          onChange={(v) => setTheme(v ? "dark" : "light")}
        />
        <PrefRow
          styles={styles}
          icon={<Type size={18} color={colors.brand} />}
          title={st.security.easyRead}
          desc={st.security.easyReadSub}
          value={easyRead}
          onChange={setEasyRead}
        />
      </Card>

      <SectionHeader title={pf.mine} />
      {me.isLoading && <LoadingState />}
      {me.error && <ErrorState message={(me.error as Error).message} />}
      {me.data && <PrefForm initial={me.data} />}

      <SectionHeader title={pf.familyMembers} />
      {fam.isLoading && <LoadingState />}
      {fam.error && <ErrorState message={(fam.error as Error).message} />}
      {fam.data?.members.length === 0 && (
        <Card>
          <Text style={styles.muted}>{pf.noOtherMembers}</Text>
        </Card>
      )}
      {fam.data?.members.map((m) => (
        <Card key={m.user_id} style={{ marginBottom: 10 }}>
          <Text style={styles.memberName}>{m.name ?? m.user_id.slice(0, 8)}</Text>
          <ReadOnlyPrefs prefs={m.prefs} styles={styles} />
        </Card>
      ))}
      <Text style={styles.hint}>{pf.selfOnlyHint}</Text>
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useSettingsStyles() {
  return useThemedStyles((colors) => ({
    muted: { fontSize: 12, color: colors.muted },
    hint: { fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 16 },
    memberName: { fontWeight: "700", marginBottom: 8, color: colors.foreground },
    prefRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 16 },
    prefTitle: { fontWeight: "700" as const, color: colors.foreground },
    quietTitle: { fontWeight: "700" as const, marginTop: 8, marginBottom: 8, color: colors.foreground },
    readGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
    infoBox: {
      width: "47%",
      backgroundColor: colors.mutedBg,
      padding: 10,
      borderRadius: radius.md,
    },
    infoLabel: { fontSize: 10, color: colors.muted },
    infoVal: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, marginTop: 2 },
  }));
}

function PrefForm({ initial }: { initial: NotificationPrefs }) {
  const qc = useQueryClient();
  const { s } = useI18n();
  const st = s.settings;
  const pf = st.prefs;
  const h = s.screens.health;
  const styles = useSettingsStyles();
  const { colors } = useTheme();
  const [med, setMed] = useState(initial.medicine_enabled);
  const [pr, setPr] = useState(initial.parent_reminder_enabled);
  const [qs, setQs] = useState(initial.quiet_start);
  const [qe, setQe] = useState(initial.quiet_end);

  useEffect(() => {
    setMed(initial.medicine_enabled);
    setPr(initial.parent_reminder_enabled);
    setQs(initial.quiet_start);
    setQe(initial.quiet_end);
  }, [initial]);

  const mut = useMutation({
    mutationFn: () =>
      updateMyPrefs({
        medicine_enabled: med,
        parent_reminder_enabled: pr,
        quiet_start: qs,
        quiet_end: qe,
      }),
    onSuccess: () => {
      toast.success(pf.settingsSaved);
      qc.invalidateQueries({ queryKey: ["np"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card style={{ marginBottom: 16 }}>
      <PrefRow
        styles={styles}
        icon={<Pill color={colors.emergency} size={18} />}
        title={h.medicine}
        desc={pf.medicineNotifDesc}
        value={med}
        onChange={setMed}
      />
      <PrefRow
        styles={styles}
        icon={<Bell color={colors.brand} size={18} />}
        title={pf.parentReminder}
        desc={pf.parentReminderDesc}
        value={pr}
        onChange={setPr}
      />
      <Text style={styles.quietTitle}>{pf.quietHoursTitle}</Text>
      <TimeField label={pf.from} value={qs} onChange={setQs} />
      <TimeField label={pf.to} value={qe} onChange={setQe} />
      <Text style={styles.hint}>{pf.quietHoursHint}</Text>
      <PrimaryButton label={pf.saveSettings} onPress={() => mut.mutate()} loading={mut.isPending} />
    </Card>
  );
}

function PrefRow({
  icon,
  title,
  desc,
  value,
  onChange,
  styles,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  styles?: ReturnType<typeof useSettingsStyles>;
}) {
  const localStyles = styles ?? useSettingsStyles();
  const { colors } = useTheme();
  return (
    <View style={localStyles.prefRow}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={localStyles.prefTitle}>{title}</Text>
        <Text style={localStyles.muted}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand }} />
    </View>
  );
}

function ReadOnlyPrefs({
  prefs,
  styles,
}: {
  prefs: NotificationPrefs;
  styles: ReturnType<typeof useSettingsStyles>;
}) {
  const { s } = useI18n();
  const pf = s.settings.prefs;
  const onOff = (v: boolean) => (v ? pf.on : pf.off);
  return (
    <View style={styles.readGrid}>
      <Info label={pf.medicineShort} value={onOff(prefs.medicine_enabled)} styles={styles} />
      <Info label={pf.parentShort} value={onOff(prefs.parent_reminder_enabled)} styles={styles} />
      <Info label={pf.from} value={prefs.quiet_start} styles={styles} />
      <Info label={pf.to} value={prefs.quiet_end} styles={styles} />
    </View>
  );
}

function Info({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof useSettingsStyles>;
}) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoVal}>{value}</Text>
    </View>
  );
}
