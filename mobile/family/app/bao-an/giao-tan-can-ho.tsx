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

export default function GiaoTanCanHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
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
      { value: apartment, label: "căn hộ nhận" },
      { value: recipientName, label: "tên người nhận" },
      { value: recipientPhone, label: "số điện thoại" },
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
        option_label: opt.label,
        delivery_fee: opt.fee,
        estimated_total: opt.fee,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã đăng ký giao tận căn hộ");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Giao tận căn hộ" subtitle="Bảo vệ mang hàng lên tận cửa" onSubmit={() => void submit()} busy={busy}>
      <FormSection title="1. Thông tin giao hàng">
        <FormField label="Căn hộ nhận" value={apartment} onChangeText={setApartment} />
        <FormField label="Người nhận" value={recipientName} onChangeText={setRecipientName} />
        <FormField label="Số điện thoại" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" />
      </FormSection>
      <FormSection title="2. Hình thức giao">
      <PlanCardSelect
        label="Hình thức giao"
        value={optionId}
        onChange={setOptionId}
        options={DELIVERY_OPTIONS.map((o) => ({
          id: o.id,
          label: o.label,
          price: o.fee === 0 ? "Miễn phí" : formatVnd(o.fee),
        }))}
      />
      </FormSection>
      <CostSummary label="Phí dịch vụ" value={formatVnd(opt.fee)} accent={opt.fee === 0} />
    </SecurityServiceScreen>
  );
}
