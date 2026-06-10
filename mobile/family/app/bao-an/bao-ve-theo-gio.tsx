import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CostSummary,
  FormField,
  FormSection,
  SecurityServiceScreen,
  formatVnd,
  todayISO,
} from "@mobile/components/security/SecurityForm";
import { createHourlyGuard, HOURLY_GUARD_RATE } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";

export default function BaoVeTheoGioScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const [busy, setBusy] = useState(false);
  const [apartment, setApartment] = useState("");
  const [serviceDate, setServiceDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [hours, setHours] = useState("4");
  const [guardCount, setGuardCount] = useState("1");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const h = Math.max(1, parseInt(hours, 10) || 1);
  const g = Math.max(1, parseInt(guardCount, 10) || 1);
  const total = h * g * HOURLY_GUARD_RATE;

  const submit = async () => {
    const err = missingFieldMessage([{ value: apartment, label: "căn hộ / khu vực" }]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createHourlyGuard({
        service_date: serviceDate,
        start_time: startTime,
        end_time: endTime,
        hours: h,
        apartment: apartment.trim(),
        description: description.trim() || null,
        guard_count: g,
        estimated_total: total,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã đăng ký bảo vệ theo giờ");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Bảo vệ theo giờ" subtitle="Đặt lịch theo khung giờ cần" onSubmit={() => void submit()} busy={busy}>
      <FormField label="Căn hộ / khu vực" value={apartment} onChangeText={setApartment} />
      <FormField label="Ngày" value={serviceDate} onChangeText={setServiceDate} />
      <FormField label="Giờ bắt đầu" value={startTime} onChangeText={setStartTime} />
      <FormField label="Giờ kết thúc" value={endTime} onChangeText={setEndTime} />
      <FormField label="Số giờ" value={hours} onChangeText={setHours} keyboardType="numeric" />
      <FormField label="Số bảo vệ" value={guardCount} onChangeText={setGuardCount} keyboardType="numeric" />
      <FormField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <Text style={{ fontSize: 13, color: "#666" }}>
        {formatVnd(HOURLY_GUARD_RATE)}/giờ/người · Ước tính: {formatVnd(total)}
      </Text>
    </SecurityServiceScreen>
  );
}
