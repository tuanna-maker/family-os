import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Button } from "@shared/ui/ui/button";
import { toast } from "sonner";
import { timeline } from "@/features/family-core/memories/data";

export const Route = createFileRoute("/ky-niem-gia-dinh_/them")({
  component: AddMemoryPage,
});

function AddMemoryPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    
    // Parse date for month label
    const d = new Date(date);
    const monthLabel = `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Mutate the mock array
    timeline.unshift({
      id: "t" + Date.now(),
      date: dateStr,
      monthLabel,
      title,
      description: desc,
      icon: "✨",
      tone: "blue",
      photoCount: 0,
    });
    
    toast.success("Đã thêm kỷ niệm mới");
    navigate({ to: "/ky-niem-gia-dinh", replace: true });
  };

  return (
    <MobileShell>
      <PageHeader eyebrow="Kỷ niệm" title="Thêm kỷ niệm" back="/ky-niem-gia-dinh" />
      <div className="px-4 mt-4">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>Tiêu đề</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ví dụ: Sinh nhật bé Na" 
              required 
              className="h-11" 
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Mô tả ngắn</Label>
            <Input 
              value={desc} 
              onChange={(e) => setDesc(e.target.value)} 
              placeholder="Cả nhà đi ăn nhà hàng..." 
              className="h-11" 
            />
          </div>
          <div className="space-y-2">
            <Label>Ngày</Label>
            <Input 
              type="date"
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
              className="h-11" 
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl bg-brand text-white font-semibold mt-4" 
          >
            Lưu kỷ niệm
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}
