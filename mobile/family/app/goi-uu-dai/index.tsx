import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createFamilyServiceRequest } from "@mobile/api/service-requests";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";
import { useRouter } from "expo-router";

export default function GoiUuDaiScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const { s } = useI18n();
  const pr = s.screens.promo;
  const c = s.common;
  const [packageName, setPackageName] = useState("");
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: packageName.trim() || pr.defaultTitle,
        description: note.trim() || undefined,
        category: "membership",
        priority: "normal",
      }),
    onSuccess: () => {
      toast.success(pr.sent);
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={pr.title} back="/(tabs)/gia-dinh" />
      <TextField label={pr.packageLabel} value={packageName} onChangeText={setPackageName} placeholder={pr.packagePh} />
      <TextField label={c.notes} value={note} onChangeText={setNote} multiline />
      <PrimaryButton label={pr.consult} onPress={() => mut.mutate()} loading={mut.isPending} />
    </Screen>
  );
}
