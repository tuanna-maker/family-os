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

export default function GuiHangDiScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
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
      { value: senderName, label: "tên người gửi" },
      { value: senderAddress, label: "địa chỉ gửi" },
      { value: senderPhone, label: "SĐT người gửi" },
      { value: recipientName, label: "tên người nhận" },
      { value: recipientAddress, label: "địa chỉ nhận" },
      { value: recipientPhone, label: "SĐT người nhận" },
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
        courier_label: courier.label,
        shipping_fee: courier.fee,
        estimated_total: courier.fee,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã đăng ký gửi hàng đi");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Gửi hàng đi" subtitle="Hỗ trợ gửi hàng qua đơn vị vận chuyển" onSubmit={() => void submit()} busy={busy}>
      <FormSection title="1. Người gửi">
        <FormField label="Người gửi" value={senderName} onChangeText={setSenderName} />
        <FormField label="Địa chỉ gửi" value={senderAddress} onChangeText={setSenderAddress} />
        <FormField label="SĐT người gửi" value={senderPhone} onChangeText={setSenderPhone} keyboardType="phone-pad" />
      </FormSection>
      <FormSection title="2. Người nhận">
        <FormField label="Người nhận" value={recipientName} onChangeText={setRecipientName} />
        <FormField label="Địa chỉ nhận" value={recipientAddress} onChangeText={setRecipientAddress} />
        <FormField label="SĐT người nhận" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" />
      </FormSection>
      <FormSection title="3. Đơn vị vận chuyển">
      <PlanCardSelect
        label="Đơn vị vận chuyển"
        value={courierId}
        onChange={setCourierId}
        options={COURIERS.map((c) => ({
          id: c.id,
          label: c.label,
          price: formatVnd(c.fee),
        }))}
      />
      </FormSection>
      <CostSummary label="Phí vận chuyển" value={formatVnd(courier.fee)} />
    </SecurityServiceScreen>
  );
}
