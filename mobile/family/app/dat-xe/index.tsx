import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { createFamilyServiceRequest } from "@mobile/api/service-requests";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";
import { useRouter } from "expo-router";

export default function DatXeScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const { s } = useI18n();
  const bc = s.screens.bookCar;
  const c = s.common;
  const [when, setWhen] = useState("");
  const [dest, setDest] = useState("");
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: bc.requestTitle(dest.trim()),
        description: [bc.whenLabel(when.trim() || bc.whenFlex), note].filter(Boolean).join("\n"),
        category: "transport",
        priority: "normal",
      }),
    onSuccess: () => {
      toast.success(bc.sent);
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={bc.title} back="/(tabs)/gia-dinh" />
      <TextField label={bc.destination} value={dest} onChangeText={setDest} placeholder={bc.destPh} />
      <TextField label={bc.when} value={when} onChangeText={setWhen} placeholder={bc.whenPh} />
      <TextField label={c.notes} value={note} onChangeText={setNote} multiline />
      <PrimaryButton label={c.send} onPress={() => mut.mutate()} loading={mut.isPending} />
    </Screen>
  );
}
