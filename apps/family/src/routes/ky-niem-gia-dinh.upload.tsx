import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Button } from "@shared/ui/ui/button";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { timeline } from "@/features/family-core/memories/data";

export const Route = createFileRoute("/ky-niem-gia-dinh/upload")({
  component: UploadPhotoPage,
});

function UploadPhotoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpload = () => {
    setLoading(true);
    // Fake upload delay
    setTimeout(() => {
      // Simulate adding to recent timeline
      if (timeline.length > 0) {
        timeline[0].photoCount = (timeline[0].photoCount || 0) + 1;
      }
      toast.success("Tải ảnh lên thành công");
      navigate({ to: "/ky-niem-gia-dinh", replace: true });
    }, 1500);
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
