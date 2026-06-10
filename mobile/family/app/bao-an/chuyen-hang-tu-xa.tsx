import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChipSelect,
  CostSummary,
  FormField,
  FormSection,
  SecurityServiceScreen,
  formatVnd,
} from "@mobile/components/security/SecurityForm";
import { createRemoteFreight, FREIGHT_WEIGHTS } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";

const BASE_FEE = 25_000;

export default function ChuyenHangTuXaScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
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
      { value: senderName, label: "tên người gửi" },
      { value: senderPhone, label: "SĐT người gửi" },
      { value: senderAddress, label: "địa chỉ gửi" },
      { value: apartment, label: "căn hộ nhận" },
      { value: recipientName, label: "tên người nhận" },
      { value: recipientPhone, label: "SĐT người nhận" },
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
        weight_label: weight.label,
        estimated_total: BASE_FEE,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã đăng ký chuyển hàng từ xa");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Chuyển hàng từ xa" subtitle="Đăng ký trước — bảo vệ hỗ trợ tiếp nhận" onSubmit={() => void submit()} busy={busy}>
      <FormField label="Người gửi (xa)" value={senderName} onChangeText={setSenderName} />
      <FormField label="SĐT người gửi" value={senderPhone} onChangeText={setSenderPhone} keyboardType="phone-pad" />
      <FormField label="Địa chỉ lấy hàng" value={senderAddress} onChangeText={setSenderAddress} multiline />
      <FormField label="Căn hộ nhận" value={apartment} onChangeText={setApartment} />
      <FormField label="Người nhận tại căn" value={recipientName} onChangeText={setRecipientName} />
      <FormField label="SĐT người nhận" value={recipientPhone} onChangeText={setRecipientPhone} keyboardType="phone-pad" />
      <ChipSelect label="Khối lượng" value={weightId} onChange={setWeightId} options={FREIGHT_WEIGHTS.map((w) => ({ id: w.id, label: w.label }))} />
      <Text style={{ fontSize: 13, color: "#666" }}>Phí dịch vụ: {formatVnd(BASE_FEE)}</Text>
    </SecurityServiceScreen>
  );
}
