import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { scanVisitorPass } from "@mobile/api/visitor-passes";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";
import { colors } from "@mobile/theme/colors";

export default function QuetMaScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const { s } = useI18n();
  const sq = s.screens.scanQr;
  const c = s.common;
  const [code, setCode] = useState("");
  const isVisitor = type === "visitor";

  const scanMut = useMutation({
    mutationFn: () => scanVisitorPass({ pass_code: code.trim() }),
    onSuccess: (res) => {
      toast.success(sq.guestEntered(res.guest_name));
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={isVisitor ? sq.visitorTitle : sq.title}
        back={isVisitor ? "/qr-vao-ra" : "/quan-ly-giup-viec"}
      />
      <Card>
        <Text style={styles.hint}>{isVisitor ? sq.visitorHint : sq.helperHint}</Text>
        <TextField label={sq.qrCode} value={code} onChangeText={setCode} placeholder="PASS-…" />
        {isVisitor ? (
          <PrimaryButton
            label={sq.confirmEntry}
            onPress={() => scanMut.mutate()}
            disabled={!code.trim()}
            loading={scanMut.isPending}
          />
        ) : (
          <Text style={styles.note}>{sq.helperNote}</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, marginBottom: 12, lineHeight: 20 },
  note: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
