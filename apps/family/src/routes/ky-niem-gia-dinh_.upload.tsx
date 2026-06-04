import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Button } from "@shared/ui/ui/button";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Camera } from "@capacitor/camera";
import { timeline } from "@/features/family-core/memories/data";

export const Route = createFileRoute("/ky-niem-gia-dinh_/upload")({
  component: UploadPhotoPage,
});

function UploadPhotoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    try {
      const result = await Camera.pickImages({
        quality: 90,
        limit: 10,
      });
      if (result && result.photos && result.photos.length > 0) {
        setLoading(true);
        // Fake upload delay for realism
        setTimeout(() => {
          if (timeline.length > 0) {
            timeline[0].photoCount = (timeline[0].photoCount || 0) + result.photos.length;
          }
          toast.success(`Đã tải lên ${result.photos.length} ảnh`);
          navigate({ to: "/ky-niem-gia-dinh", replace: true });
        }, 1500);
      }
    } catch (e: any) {
      // User cancelled or error
      if (e.message !== "User cancelled photos app") {
        toast.error("Không thể mở thư viện ảnh: " + e.message);
      }
    }
  };

  return (
    <MobileShell>
      <PageHeader eyebrow="Kỷ niệm" title="Tải ảnh lên" back="/ky-niem-gia-dinh" />
      <div className="px-4 mt-8 flex flex-col items-center">
        <div className="w-full aspect-square max-w-sm rounded-3xl border-2 border-dashed border-brand/50 bg-brand/5 flex flex-col items-center justify-center p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-brand/10 text-brand grid place-items-center mb-4">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Chọn ảnh từ thiết bị</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Hỗ trợ JPG, PNG, HEIC. Tối đa 50MB.
          </p>
          <Button 
            onClick={handleUpload}
            disabled={loading}
            className="h-11 px-8 rounded-xl bg-brand text-white font-semibold"
          >
            {loading ? "Đang tải lên..." : "Mở thư viện ảnh"}
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
