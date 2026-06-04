import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createFamilyServiceRequest } from "@mobile/api/service-requests";
import { toast } from "@mobile/utils/toast";
import { useRouter } from "expo-router";

export default function DatXeScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const [when, setWhen] = useState("");
  const [dest, setDest] = useState("");
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: `Đặt xe gia đình${dest ? `: ${dest}` : ""}`,
        description: [`Thời gian: ${when || "linh hoạt"}`, note].filter(Boolean).join("\n"),
        category: "transport",
        priority: "normal",
      }),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu đặt xe");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Đặt xe gia đình" back="/(tabs)/gia-dinh" />
      <TextField label="Điểm đến" value={dest} onChangeText={setDest} placeholder="Sân bay Tân Sơn Nhất" />
      <TextField label="Thời gian" value={when} onChangeText={setWhen} placeholder="07:00 ngày mai" />
      <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />
      <PrimaryButton label="Gửi yêu cầu" onPress={() => mut.mutate()} loading={mut.isPending} />
    </Screen>
  );
}
