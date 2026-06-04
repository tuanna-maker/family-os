import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createFamilyServiceRequest } from "@mobile/api/service-requests";
import { toast } from "@mobile/utils/toast";
import { useRouter } from "expo-router";

export default function GoiUuDaiScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const [packageName, setPackageName] = useState("");
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: packageName.trim() || "Tư vấn gói ưu đãi",
        description: note.trim() || undefined,
        category: "membership",
        priority: "normal",
      }),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu tư vấn");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title="Gói ưu đãi" back="/(tabs)/gia-dinh" />
      <TextField label="Gói quan tâm" value={packageName} onChangeText={setPackageName} placeholder="Gói Premium gia đình" />
      <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />
      <PrimaryButton label="Nhận tư vấn" onPress={() => mut.mutate()} loading={mut.isPending} />
    </Screen>
  );
}
