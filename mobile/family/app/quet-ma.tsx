import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { scanVisitorPass } from "@mobile/api/visitor-passes";
import { toast } from "@mobile/utils/toast";
import { colors } from "@mobile/theme/colors";

export default function QuetMaScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const [code, setCode] = useState("");
  const isVisitor = type === "visitor";

  const scanMut = useMutation({
    mutationFn: () => scanVisitorPass({ pass_code: code.trim() }),
    onSuccess: (res) => {
      toast.success(`Đã cho ${res.guest_name} vào`);
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader
        title={isVisitor ? "Quét mã khách" : "Quét mã"}
        back={isVisitor ? "/qr-vao-ra" : "/quan-ly-giup-viec"}
      />
      <Card>
        <Text style={styles.hint}>
          {isVisitor
            ? "Nhập mã từ thẻ QR khách (pass code)."
            : "Nhập mã ca giúp việc HLP-… hoặc mã khách."}
        </Text>
        <TextField label="Mã QR" value={code} onChangeText={setCode} placeholder="PASS-…" />
        {isVisitor ? (
          <PrimaryButton
            label="Xác nhận vào cổng"
            onPress={() => scanMut.mutate()}
            disabled={!code.trim()}
            loading={scanMut.isPending}
          />
        ) : (
          <Text style={styles.note}>Quét mã ca giúp việc: dùng màn Quản lý giúp việc trên web.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, marginBottom: 12, lineHeight: 20 },
  note: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
