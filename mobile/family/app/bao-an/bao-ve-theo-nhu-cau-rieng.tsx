import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChipSelect, FormField, SecurityServiceScreen, formatVnd } from "@mobile/components/security/SecurityForm";
import { createCustomGuard, CUSTOM_GUARD_SERVICES } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";

const BASE = 100_000;
const PER_GUARD = 80_000;

export default function BaoVeTheoNhuCauRiengScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const { s } = useI18n();
  const { colors } = useTheme();
  const f = s.security.forms;
  const scr = f.screens.customGuard;
  const [busy, setBusy] = useState(false);
  const [serviceId, setServiceId] = useState<(typeof CUSTOM_GUARD_SERVICES)[number]["id"]>("event");
  const [apartment, setApartment] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [guardCount, setGuardCount] = useState("2");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const g = Math.max(1, parseInt(guardCount, 10) || 1);
  const total = BASE + g * PER_GUARD;

  const submit = async () => {
    const err = missingFieldMessage([
      { value: apartment, label: f.validation.apartment },
      { value: startAt, label: f.validation.startAt },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createCustomGuard({
        service_id: serviceId,
        start_at: startAt.trim(),
        end_at: endAt.trim() || null,
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
      <ChipSelect
        label={f.fields.serviceType}
        value={serviceId}
        onChange={setServiceId}
        options={CUSTOM_GUARD_SERVICES.map((svc) => ({ id: svc.id, label: f.customGuardServices[svc.id] }))}
      />
      <FormField label={f.fields.area} value={apartment} onChangeText={setApartment} />
      <FormField
        label={f.fields.startAt}
        value={startAt}
        onChangeText={setStartAt}
        placeholder={f.placeholders.startAt}
      />
      <FormField
        label={f.fields.endAt}
        value={endAt}
        onChangeText={setEndAt}
        placeholder={f.placeholders.endAt}
      />
      <FormField label={f.fields.guardCount} value={guardCount} onChangeText={setGuardCount} keyboardType="numeric" />
      <FormField label={f.fields.requestDescription} value={description} onChangeText={setDescription} multiline />
      <Text style={{ fontSize: 13, color: colors.muted }}>{f.estimateTotal(formatVnd(total))}</Text>
    </SecurityServiceScreen>
  );
}
