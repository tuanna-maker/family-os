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
import { createCustomGuard, CUSTOM_GUARD_SERVICES } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";

const BASE = 100_000;
const PER_GUARD = 80_000;

export default function BaoVeTheoNhuCauRiengScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const [busy, setBusy] = useState(false);
  const [serviceId, setServiceId] = useState<(typeof CUSTOM_GUARD_SERVICES)[number]["id"]>("event");
  const [apartment, setApartment] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [guardCount, setGuardCount] = useState("2");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const g = Math.max(1, parseInt(guardCount, 10) || 1);
  const total = BASE + g * PER_GUARD;

  const submit = async () => {
    const err = missingFieldMessage([
      { value: apartment, label: "căn hộ" },
      { value: startAt, label: "thời gian bắt đầu" },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createCustomGuard({
        service_id: serviceId,
        start_at: startAt.trim(),
        end_at: endAt.trim() || null,
        apartment: apartment.trim(),
        description: description.trim() || null,
        guard_count: g,
        estimated_total: total,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã gửi yêu cầu bảo vệ riêng");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Bảo vệ theo nhu cầu riêng" subtitle="Sự kiện, tuần tra, kiểm soát ra vào…" onSubmit={() => void submit()} busy={busy}>
      <ChipSelect label="Loại dịch vụ" value={serviceId} onChange={setServiceId} options={CUSTOM_GUARD_SERVICES.map((s) => ({ id: s.id, label: s.label }))} />
      <FormField label="Căn hộ / khu vực" value={apartment} onChangeText={setApartment} />
      <FormField label="Bắt đầu" value={startAt} onChangeText={setStartAt} placeholder="VD: 18:00 15/06/2026" />
      <FormField label="Kết thúc" value={endAt} onChangeText={setEndAt} placeholder="Tuỳ chọn" />
      <FormField label="Số bảo vệ" value={guardCount} onChangeText={setGuardCount} keyboardType="numeric" />
      <FormField label="Mô tả yêu cầu" value={description} onChangeText={setDescription} multiline />
      <Text style={{ fontSize: 13, color: "#666" }}>Ước tính: {formatVnd(total)}</Text>
    </SecurityServiceScreen>
  );
}
