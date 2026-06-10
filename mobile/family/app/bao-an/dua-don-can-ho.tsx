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
  todayISO,
} from "@mobile/components/security/SecurityForm";
import { createEscort, ESCORT_BASE_FEE } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";

export default function DuaDonCanHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [recipientName, setRecipientName] = useState("");
  const [target, setTarget] = useState<"elderly" | "child" | "patient" | "other">("elderly");
  const [pickup, setPickup] = useState("Sảnh / Lobby");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (family?.apartment && !dropoff) setDropoff(family.apartment);
    if (profile?.full_name && !contactName) setContactName(profile.full_name);
  }, [family, profile, dropoff, contactName]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: recipientName, label: "tên người được đưa đón" },
      { value: pickup, label: "điểm đón" },
      { value: dropoff, label: "điểm đến" },
      { value: contactName, label: "người liên hệ" },
      { value: contactPhone, label: "SĐT liên hệ" },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createEscort({
        direction,
        direction_label: direction === "up" ? "Đưa lên căn hộ" : "Đưa xuống sảnh",
        recipient_name: recipientName.trim(),
        recipient_target: target,
        pickup_location: pickup.trim(),
        dropoff_location: dropoff.trim(),
        scheduled_date: date,
        scheduled_time: time,
        frequency: "once",
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        estimated_total: ESCORT_BASE_FEE,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã đăng ký đưa đón");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Đưa đón lên/xuống căn" subtitle="Dẫn ông bà, bé đi thang máy an toàn" onSubmit={() => void submit()} busy={busy}>
      <ChipSelect
        label="Hướng"
        value={direction}
        onChange={setDirection}
        options={[
          { id: "up", label: "Đưa lên căn hộ" },
          { id: "down", label: "Đưa xuống sảnh" },
        ]}
      />
      <ChipSelect
        label="Đối tượng"
        value={target}
        onChange={setTarget}
        options={[
          { id: "elderly", label: "Người lớn tuổi" },
          { id: "child", label: "Trẻ em" },
          { id: "patient", label: "Bệnh nhân" },
          { id: "other", label: "Khác" },
        ]}
      />
      <FormField label="Tên người được hỗ trợ" value={recipientName} onChangeText={setRecipientName} />
      <FormField label="Điểm đón" value={pickup} onChangeText={setPickup} />
      <FormField label="Điểm đến" value={dropoff} onChangeText={setDropoff} />
      <FormField label="Ngày" value={date} onChangeText={setDate} />
      <FormField label="Giờ" value={time} onChangeText={setTime} />
      <FormField label="Người liên hệ" value={contactName} onChangeText={setContactName} />
      <FormField label="SĐT" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
      <Text style={{ fontSize: 13, color: "#666" }}>Phí cơ bản: {formatVnd(ESCORT_BASE_FEE)}</Text>
    </SecurityServiceScreen>
  );
}
