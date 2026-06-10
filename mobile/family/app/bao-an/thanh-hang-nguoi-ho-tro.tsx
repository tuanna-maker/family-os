import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { FormField, FormSection, SecurityServiceScreen } from "@mobile/components/security/SecurityForm";
import { createSecurityRequest } from "@mobile/api/security";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useEffect, useState } from "react";

/** Thang hàng + người hỗ trợ — đăng ký qua security_requests (other) kèm metadata */
export default function ThanhHangNguoiHoTroScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const [busy, setBusy] = useState(false);
  const [apartment, setApartment] = useState("");
  const [schedule, setSchedule] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: apartment, label: "căn hộ" },
      { value: schedule, label: "thời gian cần thang hàng" },
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
          service_group: "Vận chuyển hàng hoá",
          service_item: "Thang hàng + người hỗ trợ",
          schedule: schedule.trim(),
          note: note.trim() || undefined,
        },
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã đăng ký thang hàng + người hỗ trợ");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Thang hàng + người hỗ trợ" subtitle="Giữ thang, bốc xếp giúp cư dân" onSubmit={() => void submit()} busy={busy}>
      <FormField label="Căn hộ" value={apartment} onChangeText={setApartment} />
      <FormField label="Thời gian cần hỗ trợ" value={schedule} onChangeText={setSchedule} placeholder="VD: 09:00–11:00 ngày mai" />
      <FormField label="Mô tả hàng hoá" value={note} onChangeText={setNote} multiline />
      <Text style={{ fontSize: 12, color: "#888" }}>BQL sẽ xác nhận phí sau khi khảo sát khối lượng.</Text>
    </SecurityServiceScreen>
  );
}
