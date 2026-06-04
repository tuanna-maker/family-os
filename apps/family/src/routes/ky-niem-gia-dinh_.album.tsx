import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Button } from "@shared/ui/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/ui/select";
import { toast } from "sonner";
import { albums, albumCategories, type AlbumCategory } from "@/features/family-core/memories/data";

export const Route = createFileRoute("/ky-niem-gia-dinh_/album")({
  component: CreateAlbumPage,
});

function CreateAlbumPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AlbumCategory>("Ngày đặc biệt");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error("Vui lòng nhập tên album");
      return;
    }
    
    const catData = albumCategories.find(c => c.key === category);
    const emoji = catData?.emoji || "🗂️";
    
    const d = new Date();
    const dateStr = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    
    albums.unshift({
      id: "a" + Date.now(),
      title,
      cover: emoji,
      count: 0,
      date: dateStr,
      category,
      tone: "blue",
    });
    
    toast.success("Đã tạo album mới");
    navigate({ to: "/ky-niem-gia-dinh", replace: true });
  };

  return (
    <MobileShell>
      <PageHeader eyebrow="Kỷ niệm" title="Tạo album" back="/ky-niem-gia-dinh" />
      <div className="px-4 mt-4">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label>Tên album</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ví dụ: Chuyến đi Phú Quốc" 
              required 
              className="h-11" 
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as AlbumCategory)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {albumCategories.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.emoji} {c.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl bg-brand text-white font-semibold mt-4" 
          >
            Tạo album
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}
