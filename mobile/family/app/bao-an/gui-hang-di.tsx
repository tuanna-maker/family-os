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
import { COURIERS, createPackageShip } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";

export default function GuiHangDiScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
  const { s } = useI18n();
  const f = s.security.forms;
  const scr = f.screens.send;
  const [busy, setBusy] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [courierId, setCourierId] = useState<(typeof COURIERS)[number]["id"]>("ghn");
  const courier = COURIERS.find((c) => c.id === courierId)!;

  useEffect(() => {
    if (profile?.full_name && !senderName) setSenderName(profile.full_name);
    if (family?.apartment && !senderAddress) setSenderAddress(family.apartment);
  }, [family, profile, senderName, senderAddress]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: senderName, label: f.validation.senderName },
      { value: senderAddress, label: f.validation.senderAddress },
      { value: senderPhone, label: f.validation.senderPhone },
      { value: recipientName, label: f.validation.recipientName },
      { value: recipientAddress, label: f.validation.recipientAddress },
      { value: recipientPhone, label: f.validation.recipientPhone },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createPackageShip({
        sender_name: senderName.trim(),
        sender_address: senderAddress.trim(),
        sender_phone: senderPhone.trim(),
        recipient_name: recipientName.trim(),
        recipient_address: recipientAddress.trim(),
        recipient_phone: recipientPhone.trim(),
        item_type: "package",
        courier_id: courierId,
        courier_label: f.couriers[courierId],
        shipping_fee: courier.fee,
        estimated_total: courier.fee,
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
      <FormSection title={f.sections.sender}>
        <FormField label={f.fields.sender} value={senderName} onChangeText={setSenderName} />
        <FormField label={f.fields.senderAddress} value={senderAddress} onChangeText={setSenderAddress} />
        <FormField
          label={f.fields.senderPhone}
          value={senderPhone}
          onChangeText={setSenderPhone}
          keyboardType="phone-pad"
        />
      </FormSection>
      <FormSection title={f.sections.recipient}>
        <FormField label={f.fields.recipient} value={recipientName} onChangeText={setRecipientName} />
        <FormField label={f.fields.recipientAddress} value={recipientAddress} onChangeText={setRecipientAddress} />
        <FormField
          label={f.fields.recipientPhone}
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
        />
      </FormSection>
      <FormSection title={f.sections.courier}>
        <PlanCardSelect
          label={f.fields.courier}
          value={courierId}
          onChange={setCourierId}
          options={COURIERS.map((c) => ({
            id: c.id,
            label: f.couriers[c.id],
            price: formatVnd(c.fee),
          }))}
        />
      </FormSection>
      <CostSummary label={f.shippingFee} value={formatVnd(courier.fee)} />
    </SecurityServiceScreen>
  );
}
