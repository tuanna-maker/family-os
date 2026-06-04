import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Camera, X } from 'lucide-react-native';

export default function IncidentReportScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title || !description) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tiêu đề và mô tả sự cố.');
      return;
    }
    setLoading(true);
    // Giả lập API
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Thành công', 'Đã gửi báo cáo sự cố!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }, 1500);
  };

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-foreground mb-6">Báo cáo Sự cố</Text>
      
      <View className="bg-white p-5 rounded-2xl shadow-sm border border-border space-y-4">
        <Input 
          label="Tiêu đề sự cố" 
          placeholder="VD: Cửa từ hầm B1 bị hỏng" 
          value={title}
          onChangeText={setTitle}
        />
        
        <View className="mt-4">
          <Text className="text-sm font-medium text-foreground mb-1">Mô tả chi tiết</Text>
          <Input 
            placeholder="Mô tả cụ thể vấn đề xảy ra..." 
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            className="h-24 text-top"
            textAlignVertical="top"
          />
        </View>

        <View className="mt-4 mb-2">
          <Text className="text-sm font-medium text-foreground mb-2">Hình ảnh hiện trường</Text>
          <View className="flex-row flex-wrap gap-2">
            {images.map((uri, index) => (
              <View key={index} className="relative">
                <Image source={{ uri }} className="w-20 h-20 rounded-lg" />
                <TouchableOpacity 
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                  onPress={() => removeImage(index)}
                >
                  <X size={14} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length < 3 && (
              <TouchableOpacity 
                className="w-20 h-20 bg-gray-100 rounded-lg border border-dashed border-gray-300 items-center justify-center"
                onPress={takePhoto}
              >
                <Camera size={24} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Button 
          className="w-full mt-6" 
          onPress={handleSubmit}
          isLoading={loading}
        >
          Gửi Báo Cáo
        </Button>
      </View>
    </ScrollView>
  );
}
