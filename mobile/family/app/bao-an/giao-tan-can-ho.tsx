import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CostSummary,
  FormField,
  FormSection,
  PlanCardSelect,
  SecurityServiceScreen,
  formatVnd,
} from "@mobile/components/security/SecurityForm";
import { createApartmentDelivery, DELIVERY_OPTIONS } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";

export default function GiaoTanCanHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const { s } = useI18n();
  const f = s.security.forms;
  const scr = f.screens.deliver;
  const [busy, setBusy] = useState(false);
  const [apartment, setApartment] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [optionId, setOptionId] = useState<(typeof DELIVERY_OPTIONS)[number]["id"]>("to_apartment");
  const opt = DELIVERY_OPTIONS.find((o) => o.id === optionId)!;

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: apartment, label: f.validation.recipientApartment },
      { value: recipientName, label: f.validation.recipientName },
      { value: recipientPhone, label: f.validation.phone },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createApartmentDelivery({
        item_type: "package",
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        apartment: apartment.trim(),
        option_id: optionId,
        option_label: f.deliveryOptions[optionId],
        delivery_fee: opt.fee,
        estimated_total: opt.fee,
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
      <FormSection title={f.sections.deliveryInfo}>
        <FormField label={f.fields.recipientApartment} value={apartment} onChangeText={setApartment} />
        <FormField label={f.fields.recipient} value={recipientName} onChangeText={setRecipientName} />
        <FormField
          label={f.fields.phone}
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
        />
      </FormSection>
      <FormSection title={f.sections.deliveryMethod}>
        <PlanCardSelect
          label={f.fields.deliveryMethod}
          value={optionId}
          onChange={setOptionId}
          options={DELIVERY_OPTIONS.map((o) => ({
            id: o.id,
            label: f.deliveryOptions[o.id],
            price: o.fee === 0 ? f.free : formatVnd(o.fee),
          }))}
        />
      </FormSection>
      <CostSummary label={f.serviceFee} value={formatVnd(opt.fee)} accent={opt.fee === 0} />
    </SecurityServiceScreen>
  );
}
