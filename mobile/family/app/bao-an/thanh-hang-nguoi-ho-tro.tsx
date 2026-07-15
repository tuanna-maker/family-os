import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { FormField, SecurityServiceScreen } from "@mobile/components/security/SecurityForm";
import { createSecurityRequest } from "@mobile/api/security";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";

export default function ThanhHangNguoiHoTroScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const { s } = useI18n();
  const { colors } = useTheme();
  const f = s.security.forms;
  const scr = f.screens.freightLift;
  const [busy, setBusy] = useState(false);
  const [apartment, setApartment] = useState("");
  const [schedule, setSchedule] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: apartment, label: f.validation.apartment },
      { value: schedule, label: f.validation.liftSchedule },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createSecurityRequest({
        request_type: "other",
        apartment: apartment.trim(),
        payload: {
          service_group: scr.serviceGroup,
          service_item: scr.serviceItem,
          schedule: schedule.trim(),
          note: note.trim() || undefined,
        },
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
      <FormField label={f.fields.apartment} value={apartment} onChangeText={setApartment} />
      <FormField
        label={f.fields.liftSchedule}
        value={schedule}
        onChangeText={setSchedule}
        placeholder={f.placeholders.liftSchedule}
      />
      <FormField label={f.fields.goodsDescription} value={note} onChangeText={setNote} multiline />
      <Text style={{ fontSize: 12, color: colors.muted }}>{f.feeAfterSurvey}</Text>
    </SecurityServiceScreen>
  );
}
