import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { EditChildAlbumSheet } from "@mobile/components/children/EditChildAlbumSheet";

function paramId(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function EditChildAlbumRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ albumId?: string | string[]; childId?: string | string[] }>();
  const albumId = paramId(params.albumId);
  const childId = paramId(params.childId);

  if (!albumId || !childId) return <View style={{ flex: 1, backgroundColor: "transparent" }} />;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <EditChildAlbumSheet
        visible
        albumId={albumId}
        childId={childId}
        onClose={() => router.back()}
      />
    </View>
  );
}
