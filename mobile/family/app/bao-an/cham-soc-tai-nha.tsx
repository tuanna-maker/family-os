import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChipSelect,
  CostSummary,
  FormField,
  FormSection,
  PlanCardSelect,
  SecurityServiceScreen,
  formatVnd,
  todayISO,
} from "@mobile/components/security/SecurityForm";
import { CARE_DURATIONS, createHomeCare } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";

const TARGET_OPTIONS = ["elderly", "child", "patient", "other"] as const;

export default function ChamSocTaiNhaScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
  const { s } = useI18n();
  const f = s.security.forms;
  const scr = f.screens.care;
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<(typeof TARGET_OPTIONS)[number]>("elderly");
  const [otherTarget, setOtherTarget] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [apartment, setApartment] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("09:00");
  const [durationId, setDurationId] = useState<(typeof CARE_DURATIONS)[number]["id"]>("h2");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const dur = CARE_DURATIONS.find((d) => d.id === durationId)!;

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
    if (profile?.full_name && !contactName) setContactName(profile.full_name);
  }, [family, profile, apartment, contactName]);

  const submit = async () => {
    const err =
      missingFieldMessage([
        { value: recipientName, label: f.validation.careRecipient },
        { value: apartment, label: f.validation.apartment },
        { value: contactName, label: f.validation.contact },
        { value: contactPhone, label: f.validation.contactPhone },
      ]) ??
      (target === "other"
        ? missingFieldMessage([{ value: otherTarget, label: scr.otherTarget }])
        : null);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createHomeCare({
        target,
        recipient_name: recipientName.trim(),
        apartment: apartment.trim(),
        start_date: startDate,
        start_time: startTime,
        duration_id: durationId,
        duration_label: f.careDurations[durationId],
        duration_hours: dur.hours,
        tasks: target === "other" && otherTarget.trim() ? [otherTarget.trim()] : [],
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        base_fee: dur.fee,
        estimated_total: dur.fee,
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
      <FormSection title={f.sections.careInfo}>
        <ChipSelect
          label={f.fields.target}
          value={target}
          onChange={setTarget}
          otherId="other"
          otherValue={otherTarget}
          onOtherChange={setOtherTarget}
          options={TARGET_OPTIONS.map((id) => ({ id, label: f.targets[id] }))}
        />
        <FormField label={f.fields.careRecipient} value={recipientName} onChangeText={setRecipientName} />
        <FormField label={f.fields.apartment} value={apartment} onChangeText={setApartment} />
        <FormField label={f.fields.startDate} value={startDate} onChangeText={setStartDate} />
        <FormField label={f.fields.startTime} value={startTime} onChangeText={setStartTime} />
        <PlanCardSelect
          label={f.fields.duration}
          value={durationId}
          onChange={setDurationId}
          options={CARE_DURATIONS.map((d) => ({
            id: d.id,
            label: f.careDurations[d.id],
            price: formatVnd(d.fee),
          }))}
        />
        <FormField label={f.fields.contact} value={contactName} onChangeText={setContactName} />
        <FormField
          label={f.fields.contactPhone}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />
      </FormSection>
      <CostSummary label={f.estimate} value={formatVnd(dur.fee)} />
    </SecurityServiceScreen>
  );
}
