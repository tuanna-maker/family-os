import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/ui/select";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { Camera } from "@capacitor/camera";
import { useFamilyContext } from "@/hooks/use-family-context";
import { createMoment, uploadMomentFile } from "@/api/moments";
import { listAlbums } from "@/api/albums";
import { requireAuth } from "@/api/require-auth";

const uploadSearch = z.object({ album_id: z.string().uuid().optional() });

export const Route = createFileRoute("/ky-niem-gia-dinh_/upload")({
  validateSearch: uploadSearch,
  beforeLoad: ({ location }) => requireAuth({ location }),
  component: UploadPhotoPage,
});

function UploadPhotoPage() {
  const navigate = useNavigate();
  const { album_id: albumIdFromSearch } = Route.useSearch();
  const { familyId } = useFamilyContext();
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState("");
  const [albumId, setAlbumId] = useState(albumIdFromSearch ?? "");

  const albumsQ = useQuery({
    queryKey: ["family-albums", familyId],
    queryFn: () => listAlbums({ family_id: familyId! }),
    enabled: !!familyId,
  });
  const albums = albumsQ.data?.albums ?? [];
  const effectiveAlbumId = albumId || undefined;

  const handleUpload = async () => {
    if (!familyId) {
      toast.error("Chưa có hộ gia đình");
      return;
    }
    try {
      const result = await Camera.pickImages({ quality: 90, limit: 10 });
      if (!result.photos?.length) return;
      setLoading(true);
      let count = 0;
      for (const photo of result.photos) {
        if (!photo.webPath) continue;
        const res = await fetch(photo.webPath);
        const blob = await res.blob();
        const file = new File([blob], `moment-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
        const { publicUrl } = await uploadMomentFile({ family_id: familyId, file });
        await createMoment({
          family_id: familyId,
          media_url: publicUrl,
          caption: caption.trim() || undefined,
          album_id: effectiveAlbumId,
        });
        count++;
      }
      toast.success(`Đã tải lên ${count} ảnh`);
      navigate({
        to: effectiveAlbumId ? "/ky-niem-gia-dinh/album/$albumId" : "/ky-niem-gia-dinh",
        params: effectiveAlbumId ? { albumId: effectiveAlbumId } : undefined,
        replace: true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== "User cancelled photos app") toast.error("Không thể tải ảnh: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell>
      <PageHeader eyebrow="Kỷ niệm" title="Tải ảnh lên" back="/ky-niem-gia-dinh" />
      <div className="px-4 mt-4 space-y-4">
        <div>
          <Label>Chú thích (tuỳ chọn)</Label>
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Kỷ niệm hôm nay…" />
        </div>
        {albums.length > 0 && (
          <div>
            <Label>Album (tuỳ chọn)</Label>
            <Select value={albumId || "__none__"} onValueChange={(v) => setAlbumId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Không gán album" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không gán album</SelectItem>
                {albums.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.cover_emoji} {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="w-full aspect-square max-w-sm mx-auto rounded-3xl border-2 border-dashed border-brand/50 bg-brand/5 flex flex-col items-center justify-center p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-brand/10 text-brand grid place-items-center mb-4">
            {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <UploadCloud className="h-8 w-8" />}
          </div>
          <h3 className="text-lg font-semibold mb-2">Chọn ảnh từ thiết bị</h3>
          <p className="text-sm text-muted-foreground mb-6">JPG, PNG · tối đa 10MB/ảnh · bucket family-moments</p>
          <Button onClick={handleUpload} disabled={loading || !familyId} className="h-11 px-8 rounded-xl">
            {loading ? "Đang tải…" : "Mở thư viện ảnh"}
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
