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
import { createGuardHandle, GUARD_TASKS } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";

export default function BaoVeXuLyHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family } = useFamilyContext();
  const { s } = useI18n();
  const f = s.security.forms;
  const scr = f.screens.guardHandle;
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
    const err = missingFieldMessage([{ value: apartment, label: f.validation.apartment }]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createGuardHandle({
        task_id: taskId,
        task_label: f.guardTasks[taskId],
        apartment: apartment.trim(),
        desired_time: desiredTime.trim() || null,
        description: description.trim() || null,
        estimated_total: task.fee,
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
      <FormSection title={f.sections.taskType}>
        <PlanCardSelect
          label={f.fields.taskType}
          value={taskId}
          onChange={setTaskId}
          options={GUARD_TASKS.map((t) => ({ id: t.id, label: f.guardTasks[t.id], price: formatVnd(t.fee) }))}
        />
      </FormSection>
      <FormSection title={f.sections.requestDetail}>
        <FormField label={f.fields.apartment} value={apartment} onChangeText={setApartment} />
        <FormField
          label={f.fields.desiredTime}
          value={desiredTime}
          onChangeText={setDesiredTime}
          placeholder={f.placeholders.desiredTime}
        />
        <FormField label={f.fields.description} value={description} onChangeText={setDescription} multiline />
      </FormSection>
      <CostSummary label={f.estimate} value={formatVnd(task.fee)} />
    </SecurityServiceScreen>
  );
}
