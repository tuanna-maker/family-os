import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  AlertTriangle,
  Flame,
  Wrench,
  Package,
  Car,
  MoreHorizontal,
  Camera,
  ImagePlus,
  X,
} from "lucide-react-native";
import { SubHeader } from "@mobile/components/SubHeader";
import { Input } from "@mobile/components/ui/Input";
import { Button } from "@mobile/components/ui/Button";
import { createSecurityRequest, attachSecurityRequestEvidence } from "@guard/api/security";
import { readLocalFileBytes } from "@mobile/lib/upload-chat-media";
import { getSupabase } from "@shared/supabase/get-client";
import { useTheme } from "@mobile/theme/themeStore";

const TYPES = [
  { icon: AlertTriangle, label: "An ninh", key: "intrusion", color: "#ef4444", bg: "#fee2e2" },
  { icon: Flame, label: "PCCC", key: "fire", color: "#f59e0b", bg: "#fef3c7" },
  { icon: Wrench, label: "Kỹ thuật", key: "other", color: "#2563eb", bg: "#dbeafe" },
  { icon: Package, label: "Mất mát", key: "other", color: "#d97706", bg: "#ffedd5" },
  { icon: Car, label: "Giao thông", key: "other", color: "#7c3aed", bg: "#ede9fe" },
  { icon: MoreHorizontal, label: "Khác", key: "other", color: "#6b7280", bg: "#f3f4f6" },
] as const;

const MAX_PHOTOS = 5;
const BUCKET = "security-attachments";

type PickedPhoto = {
  uri: string;
  name: string;
  mime: string;
  size: number;
};

export default function IncidentReportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<(typeof TYPES)[number] | null>(null);
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  const addPhotos = (assets: ImagePicker.ImagePickerAsset[]) => {
    const next: PickedPhoto[] = [];
    for (const asset of assets) {
      if (photos.length + next.length >= MAX_PHOTOS) break;
      next.push({
        uri: asset.uri,
        name: asset.fileName ?? `anh-${Date.now()}.jpg`,
        mime: asset.mimeType ?? "image/jpeg",
        size: asset.fileSize && asset.fileSize > 0 ? asset.fileSize : 1,
      });
    }
    if (next.length > 0) {
      setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    }
  };

  const pickFromLibrary = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAppAlert({ title: "Lỗi", message: "Cần quyền truy cập thư viện ảnh." });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (res.canceled) return;
    addPhotos(res.assets);
  };

  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showAppAlert({ title: "Lỗi", message: "Cần quyền truy cập camera để chụp ảnh." });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled) return;
    addPhotos(res.assets);
  };

  const uploadPhotos = async (requestId: string) => {
    if (photos.length === 0) return;
    const supabase = getSupabase();
    const uploaded: { path: string; name: string; size: number; mime: string }[] = [];
    for (const photo of photos) {
      const ext = photo.name.split(".").pop() ?? "jpg";
      const path = `${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const bytes = await readLocalFileBytes(photo.uri);
      const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: photo.mime,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploaded.push({ path, name: photo.name, size: photo.size, mime: photo.mime });
    }
    if (uploaded.length > 0) {
      await attachSecurityRequestEvidence({ id: requestId, files: uploaded });
    }
  };

  const handleSubmit = async () => {
    if (!selected || !detail.trim()) {
      showAppAlert({ title: "Lỗi", message: "Vui lòng chọn loại sự cố và mô tả chi tiết." });
      return;
    }
    setLoading(true);
    try {
      const res = await createSecurityRequest({
        request_type: selected.key,
        building: location.trim() || null,
        apartment: null,
        payload: {
          incident_category: selected.label,
          description: detail.trim(),
          photo_count: photos.length,
        },
      });
      try {
        await uploadPhotos(res.id);
      } catch (e) {
        showAppAlert({
          title: "Cảnh báo",
          message:
            (e instanceof Error ? e.message : "Không tải được ảnh") +
            ". Báo cáo đã gửi nhưng ảnh chưa đính kèm.",
          buttons: [{ text: "OK", onPress: () => router.back() }],
        });
        return;
      }
      showAppAlert({
        title: "Thành công",
        message: "Đã gửi báo cáo sự cố!",
        buttons: [{ text: "OK", onPress: () => router.back() }],
      });
    } catch (e) {
      showAppAlert({ title: "Lỗi", message: (e as Error).message || "Không gửi được báo cáo" });
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

            <Text className="text-sm font-semibold mt-5 mb-2 text-foreground">
              Ảnh minh chứng ({photos.length}/{MAX_PHOTOS})
            </Text>
            <View className="flex-row gap-2 mb-3">
              <Pressable
                onPress={() => void pickFromLibrary()}
                disabled={photos.length >= MAX_PHOTOS}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 py-3"
                style={{ opacity: photos.length >= MAX_PHOTOS ? 0.5 : 1 }}
              >
                <ImagePlus size={18} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Chọn ảnh</Text>
              </Pressable>
              <Pressable
                onPress={() => void takePhoto()}
                disabled={photos.length >= MAX_PHOTOS}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 py-3"
                style={{ opacity: photos.length >= MAX_PHOTOS ? 0.5 : 1 }}
              >
                <Camera size={18} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Chụp ảnh</Text>
              </Pressable>
            </View>
            {photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {photos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} className="mr-3 relative">
                    <Image source={{ uri: photo.uri }} className="h-20 w-20 rounded-xl" />
                    <Pressable
                      onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emergency items-center justify-center"
                    >
                      <X size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text className="text-xs text-muted-foreground mb-2">
                Tối đa {MAX_PHOTOS} ảnh. Có thể chọn từ thư viện hoặc chụp trực tiếp.
              </Text>
            )}

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
              {photos.length > 0 ? (
                <Text className="text-sm text-muted-foreground mt-2">
                  Đính kèm {photos.length} ảnh
                </Text>
              ) : null}
            </View>
            {photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {photos.map((photo, index) => (
                  <Image
                    key={`${photo.uri}-${index}`}
                    source={{ uri: photo.uri }}
                    className="h-16 w-16 rounded-lg mr-2"
                  />
                ))}
              </ScrollView>
            ) : null}
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
