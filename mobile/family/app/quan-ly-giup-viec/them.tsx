import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { TimeField } from "@mobile/components/DateTimeField";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { listHelpers, upsertHelper, upsertHelperTask } from "@mobile/api/helpers";
import { toast } from "@mobile/utils/toast";

type FormType = "helper" | "task";

export default function GiupViecThemScreen() {
  const { type = "helper", helperId, id } = useLocalSearchParams<{ type?: FormType; helperId?: string; id?: string }>();
  const formType = (type ?? "helper") as FormType;
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Giúp việc");
  const [salary, setSalary] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("09:00");
  const [loaded, setLoaded] = useState(!id);

  const helpersQ = useQuery({
    queryKey: ["family-helpers", familyId],
    queryFn: () => listHelpers({ family_id: familyId! }),
    enabled: !!familyId && formType === "helper" && !!id,
  });

  useEffect(() => {
    if (!id || formType !== "helper" || !helpersQ.data) return;
    const helper = helpersQ.data.find((h) => h.id === id);
    if (!helper) return;
    setName(helper.name);
    setPhone(helper.phone ?? "");
    setRole(helper.role ?? "Giúp việc");
    setSalary(helper.salary != null ? String(helper.salary) : "");
    setLoaded(true);
  }, [id, formType, helpersQ.data]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error("Chưa có gia đình");
      if (formType === "helper") {
        return upsertHelper({
          id,
          family_id: familyId,
          name: name.trim(),
          phone: phone.trim() || undefined,
          role: role.trim() || undefined,
          salary: salary ? Number(salary) : undefined,
        });
      }
      if (!helperId) throw new Error("Chọn giúp việc trước");
      return upsertHelperTask({
        helper_id: helperId,
        title: taskTitle.trim(),
        time: taskTime,
        task_date: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-helpers"] });
      qc.invalidateQueries({ queryKey: ["helper-bundle"] });
      toast.success("Đã lưu");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const title = formType === "helper" ? (id ? "Sửa hồ sơ" : "Thêm giúp việc") : "Thêm việc";

  if (id && formType === "helper" && (!loaded || helpersQ.isLoading)) {
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHeader title={title} back="/quan-ly-giup-viec" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={title} back="/quan-ly-giup-viec" />

      {formType === "helper" ? (
        <>
          <TextField label="Họ tên" value={name} onChangeText={setName} />
          <TextField label="SĐT" value={phone} onChangeText={setPhone} keyboardType="numeric" />
          <TextField label="Vai trò" value={role} onChangeText={setRole} />
          <TextField label="Lương tháng" value={salary} onChangeText={setSalary} keyboardType="numeric" />
        </>
      ) : (
        <>
          <TextField label="Công việc" value={taskTitle} onChangeText={setTaskTitle} placeholder="Dọn phòng khách" />
          <TimeField label="Giờ làm" value={taskTime} onChange={setTaskTime} />
        </>
      )}

      <View style={{ marginTop: 8 }}>
        <PrimaryButton label="Lưu" onPress={() => mut.mutate()} loading={mut.isPending} />
      </View>
    </Screen>
  );
}
