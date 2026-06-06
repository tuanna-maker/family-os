import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Flame,
  Wrench,
  Package,
  Car,
  MoreHorizontal,
} from "lucide-react-native";
import { SubHeader } from "@mobile/components/SubHeader";
import { Input } from "@mobile/components/ui/Input";
import { Button } from "@mobile/components/ui/Button";
import { createSecurityRequest } from "@guard/api/security";

const TYPES = [
  { icon: AlertTriangle, label: "An ninh", key: "intrusion", color: "#ef4444", bg: "#fee2e2" },
  { icon: Flame, label: "PCCC", key: "fire", color: "#f59e0b", bg: "#fef3c7" },
  { icon: Wrench, label: "Kỹ thuật", key: "other", color: "#2563eb", bg: "#dbeafe" },
  { icon: Package, label: "Mất mát", key: "other", color: "#d97706", bg: "#ffedd5" },
  { icon: Car, label: "Giao thông", key: "other", color: "#7c3aed", bg: "#ede9fe" },
  { icon: MoreHorizontal, label: "Khác", key: "other", color: "#6b7280", bg: "#f3f4f6" },
] as const;

export default function IncidentReportScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<(typeof TYPES)[number] | null>(null);
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selected || !detail.trim()) {
      Alert.alert("Lỗi", "Vui lòng chọn loại sự cố và mô tả chi tiết.");
      return;
    }
    setLoading(true);
    try {
      await createSecurityRequest({
        request_type: selected.key,
        building: location.trim() || null,
        apartment: null,
        payload: { incident_category: selected.label, description: detail.trim() },
      });
      Alert.alert("Thành công", "Đã gửi báo cáo sự cố!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Lỗi", (e as Error).message || "Không gửi được báo cáo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SubHeader title="BÁO SỰ CỐ" />
      <ScrollView className="flex-1 p-5">
        <View className="flex-row justify-between mb-6">
          {["Loại sự cố", "Chi tiết", "Gửi báo cáo"].map((s, i) => (
            <View key={s} className="items-center flex-1">
              <View
                className={`h-7 w-7 rounded-full items-center justify-center mb-1 ${
                  i <= step ? "bg-brand" : "bg-muted"
                }`}
              >
                <Text className={`text-xs font-bold ${i <= step ? "text-white" : "text-muted-foreground"}`}>
                  {i + 1}
                </Text>
              </View>
              <Text className={`text-[10px] ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {s}
              </Text>
            </View>
          ))}
        </View>

        {step === 0 && (
          <>
            <Text className="text-sm font-semibold mb-3 text-foreground">Chọn loại sự cố</Text>
            <View className="flex-row flex-wrap justify-between">
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => {
                    setSelected(t);
                    setStep(1);
                  }}
                  className="w-[48%] rounded-2xl bg-card border border-border p-4 mb-3 items-center"
                >
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center mb-2"
                    style={{ backgroundColor: t.bg }}
                  >
                    <t.icon size={24} color={t.color} />
                  </View>
                  <Text className="text-sm font-semibold text-foreground">{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 1 && selected && (
          <>
            <Text className="text-sm font-semibold mb-1 text-foreground">Loại: {selected.label}</Text>
            <Input
              label="Vị trí / khu vực"
              placeholder="VD: Hầm B1 - Khu A"
              value={location}
              onChangeText={setLocation}
              className="mt-3"
            />
            <View className="mt-4">
              <Input
                label="Mô tả chi tiết"
                placeholder="Mô tả cụ thể vấn đề..."
                value={detail}
                onChangeText={setDetail}
                multiline
                numberOfLines={4}
              />
            </View>
            <View className="flex-row gap-2 mt-6">
              <Button variant="outline" className="flex-1" onPress={() => setStep(0)}>
                Quay lại
              </Button>
              <Button className="flex-1" onPress={() => setStep(2)} disabled={!detail.trim()}>
                Tiếp tục
              </Button>
            </View>
          </>
        )}

        {step === 2 && selected && (
          <>
            <View className="bg-card rounded-2xl border border-border p-4 mb-4">
              <Text className="font-semibold text-foreground">{selected.label}</Text>
              {location ? (
                <Text className="text-sm text-muted-foreground mt-1">{location}</Text>
              ) : null}
              <Text className="text-sm mt-2 text-foreground">{detail}</Text>
            </View>
            <Button onPress={handleSubmit} isLoading={loading} className="w-full">
              Gửi Báo Cáo
            </Button>
            <Button variant="outline" className="w-full mt-2" onPress={() => setStep(1)}>
              Sửa lại
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
}
