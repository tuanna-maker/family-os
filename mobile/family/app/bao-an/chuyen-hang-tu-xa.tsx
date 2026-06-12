import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChipSelect, FormField, SecurityServiceScreen, formatVnd } from "@mobile/components/security/SecurityForm";
import { createRemoteFreight, FREIGHT_WEIGHTS } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";

const BASE_FEE = 25_000;

export default function ChuyenHangTuXaScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const { s } = useI18n();
  const { colors } = useTheme();
  const f = s.security.forms;
  const scr = f.screens.remoteFreight;
  const [busy, setBusy] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [weightId, setWeightId] = useState<(typeof FREIGHT_WEIGHTS)[number]["id"]>("1-5");
  const weight = FREIGHT_WEIGHTS.find((w) => w.id === weightId)!;

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: senderName, label: f.validation.remoteSender },
      { value: senderPhone, label: f.validation.remoteSenderPhone },
      { value: senderAddress, label: f.validation.remotePickup },
      { value: apartment, label: f.validation.recipientApartment },
      { value: recipientName, label: f.validation.recipientName },
      { value: recipientPhone, label: f.validation.recipientPhone },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createRemoteFreight({
        sender_name: senderName.trim(),
        sender_phone: senderPhone.trim(),
        sender_address: senderAddress.trim(),
        apartment: apartment.trim(),
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        item_type: "package",
        weight_id: weightId,
        weight_label: f.freightWeights[weightId],
        estimated_total: BASE_FEE,
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
      <FormField label={f.fields.remoteSender} value={senderName} onChangeText={setSenderName} />
      <FormField
        label={f.fields.senderPhone}
        value={senderPhone}
        onChangeText={setSenderPhone}
        keyboardType="phone-pad"
      />
      <FormField
        label={f.fields.pickupAddress}
        value={senderAddress}
        onChangeText={setSenderAddress}
        multiline
      />
      <FormField label={f.fields.recipientApartment} value={apartment} onChangeText={setApartment} />
      <FormField label={f.fields.unitRecipient} value={recipientName} onChangeText={setRecipientName} />
      <FormField
        label={f.fields.recipientPhone}
        value={recipientPhone}
        onChangeText={setRecipientPhone}
        keyboardType="phone-pad"
      />
      <ChipSelect
        label={f.fields.weight}
        value={weightId}
        onChange={setWeightId}
        options={FREIGHT_WEIGHTS.map((w) => ({ id: w.id, label: f.freightWeights[w.id] }))}
      />
      <Text style={{ fontSize: 13, color: colors.muted }}>{f.serviceFeeAmount(formatVnd(BASE_FEE))}</Text>
    </SecurityServiceScreen>
  );
}
