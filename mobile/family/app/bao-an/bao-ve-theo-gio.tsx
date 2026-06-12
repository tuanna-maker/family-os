import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { FormField, SecurityServiceScreen, formatVnd, todayISO } from "@mobile/components/security/SecurityForm";
import { createHourlyGuard, HOURLY_GUARD_RATE } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";

export default function BaoVeTheoGioScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const { s } = useI18n();
  const { colors } = useTheme();
  const f = s.security.forms;
  const scr = f.screens.hourlyGuard;
  const [busy, setBusy] = useState(false);
  const [apartment, setApartment] = useState("");
  const [serviceDate, setServiceDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [hours, setHours] = useState("4");
  const [guardCount, setGuardCount] = useState("1");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const h = Math.max(1, parseInt(hours, 10) || 1);
  const g = Math.max(1, parseInt(guardCount, 10) || 1);
  const total = h * g * HOURLY_GUARD_RATE;

  const submit = async () => {
    const err = missingFieldMessage([{ value: apartment, label: f.validation.area }]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createHourlyGuard({
        service_date: serviceDate,
        start_time: startTime,
        end_time: endTime,
        hours: h,
        apartment: apartment.trim(),
        description: description.trim() || null,
        guard_count: g,
        estimated_total: total,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(scr.success);
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : f.sendFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title={scr.title} subtitle={scr.subtitle} onSubmit={() => void submit()} busy={busy}>
      <FormField label={f.fields.area} value={apartment} onChangeText={setApartment} />
      <FormField label={f.fields.date} value={serviceDate} onChangeText={setServiceDate} />
      <FormField label={f.fields.startTime} value={startTime} onChangeText={setStartTime} />
      <FormField label={f.fields.endTime} value={endTime} onChangeText={setEndTime} />
      <FormField label={f.fields.hours} value={hours} onChangeText={setHours} keyboardType="numeric" />
      <FormField label={f.fields.guardCount} value={guardCount} onChangeText={setGuardCount} keyboardType="numeric" />
      <FormField label={f.fields.description} value={description} onChangeText={setDescription} multiline />
      <Text style={{ fontSize: 13, color: colors.muted }}>
        {f.hourlyRate(formatVnd(HOURLY_GUARD_RATE), formatVnd(total))}
      </Text>
    </SecurityServiceScreen>
  );
}
