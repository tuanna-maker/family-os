import { useEffect, useState } from "react";
import { Text } from "react-native";
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
import { createGuardHandle, GUARD_TASKS } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";

export default function BaoVeXuLyHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const [busy, setBusy] = useState(false);
  const [taskId, setTaskId] = useState<(typeof GUARD_TASKS)[number]["id"]>("inspect");
  const [apartment, setApartment] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [description, setDescription] = useState("");
  const task = GUARD_TASKS.find((t) => t.id === taskId)!;

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
  }, [family, apartment]);

  const submit = async () => {
    const err = missingFieldMessage([{ value: apartment, label: "căn hộ" }]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createGuardHandle({
        task_id: taskId,
        task_label: task.label,
        apartment: apartment.trim(),
        desired_time: desiredTime.trim() || null,
        description: description.trim() || null,
        estimated_total: task.fee,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã gửi yêu cầu hỗ trợ khi vắng nhà");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Bảo vệ hỗ trợ khi vắng nhà" subtitle="Mở cửa, tưới cây, chăm thú cưng…" onSubmit={() => void submit()} busy={busy}>
      <FormSection title="1. Loại hỗ trợ">
      <PlanCardSelect
        label="Loại hỗ trợ"
        value={taskId}
        onChange={setTaskId}
        options={GUARD_TASKS.map((t) => ({ id: t.id, label: t.label, price: formatVnd(t.fee) }))}
      />
      </FormSection>
      <FormSection title="2. Chi tiết yêu cầu">
        <FormField label="Căn hộ" value={apartment} onChangeText={setApartment} />
        <FormField label="Thời gian mong muốn" value={desiredTime} onChangeText={setDesiredTime} placeholder="VD: 14:00 – 16:00 hôm nay" />
        <FormField label="Mô tả thêm" value={description} onChangeText={setDescription} multiline />
      </FormSection>
      <CostSummary label="Ước tính" value={formatVnd(task.fee)} />
    </SecurityServiceScreen>
  );
}
