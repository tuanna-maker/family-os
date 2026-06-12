import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChipSelect,
  CostSummary,
  FormField,
  FormSection,
  FormSwitch,
  PlanCardSelect,
  SecurityServiceScreen,
  todayISO,
} from "@mobile/components/security/SecurityForm";
import { createPackageHold, HOLD_PLANS, ITEM_TYPES } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { securityMeta } from "@mobile/constants/security";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";

export default function NhanHangHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
  const { s } = useI18n();
  const f = s.security.forms;
  const scr = f.screens.receive;
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [itemType, setItemType] = useState<(typeof ITEM_TYPES)[number]>("package");
  const [courier, setCourier] = useState(f.defaultCourier);
  const [expectedDate, setExpectedDate] = useState(todayISO());
  const [holdPlan, setHoldPlan] = useState<(typeof HOLD_PLANS)[number]>("standard");
  const [notify, setNotify] = useState(true);
  const [photo, setPhoto] = useState(true);

  useEffect(() => {
    if (family?.apartment && !address) setAddress(family.apartment);
    if (profile?.full_name && !recipient) setRecipient(profile.full_name);
  }, [family, profile, address, recipient]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: address, label: f.validation.apartmentAddress },
      { value: recipient, label: f.validation.recipient },
      { value: phone, label: f.validation.phone },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const res = await createPackageHold({
        address: address.trim(),
        recipient_name: recipient.trim(),
        phone: phone.trim(),
        item_type: itemType,
        courier,
        expected_date: expectedDate,
        hold_plan: holdPlan,
        notify_on_arrival: notify,
        photo_on_receive: photo,
        estimated_cost: 0,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(scr.success(res.ticket_code ?? ""), scr.successSub(securityMeta.responseTimeMinutes));
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : f.sendFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title={scr.title} subtitle={scr.subtitle} onSubmit={() => void submit()} busy={busy}>
      <FormSection title={f.sections.receiveInfo}>
        <FormField
          label={f.fields.apartmentAddress}
          value={address}
          onChangeText={setAddress}
          placeholder={f.placeholders.apartment}
        />
        <FormField
          label={f.fields.recipientName}
          value={recipient}
          onChangeText={setRecipient}
          placeholder={f.placeholders.recipientName}
        />
        <FormField
          label={f.fields.phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder={f.placeholders.phone}
        />
      </FormSection>

      <FormSection title={f.sections.orderInfo}>
        <ChipSelect
          label={f.fields.itemType}
          value={itemType}
          onChange={setItemType}
          options={ITEM_TYPES.map((id) => ({ id, label: f.itemTypes[id] }))}
        />
        <FormField
          label={f.fields.courier}
          value={courier}
          onChangeText={setCourier}
          placeholder={f.placeholders.courier}
        />
        <FormField label={f.fields.expectedDate} value={expectedDate} onChangeText={setExpectedDate} />
      </FormSection>

      <FormSection title={f.sections.holdOptions}>
        <PlanCardSelect
          label={f.fields.holdPlan}
          value={holdPlan}
          onChange={setHoldPlan}
          options={HOLD_PLANS.map((id) => ({
            id,
            label: f.holdPlans[id].label,
            sub: f.holdPlans[id].sub,
            price: f.holdPlans[id].price,
          }))}
        />
      </FormSection>

      <FormSection title={f.sections.extraOptions}>
        <FormSwitch
          label={f.switches.notifyOnArrival}
          description={f.switches.notifyOnArrivalDesc}
          value={notify}
          onValueChange={setNotify}
        />
        <FormSwitch
          label={f.switches.photoOnReceive}
          description={f.switches.photoOnReceiveDesc}
          value={photo}
          onValueChange={setPhoto}
        />
      </FormSection>

      <CostSummary label={f.estimatedCost} value={f.holdPlans[holdPlan].price} accent />
    </SecurityServiceScreen>
  );
}
