import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { Button } from "@shared/ui/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/ui/select";
import { toast } from "sonner";
import { createExpense } from "@/api/expenses";
import { getMyContext } from "@/api/auth";

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Ăn uống": { icon: "🍱", color: "#10B981" },
  "Nhà cửa": { icon: "🏠", color: "#3B82F6" },
  "Con cái": { icon: "🎒", color: "#EC4899" },
  "Sức khỏe": { icon: "💊", color: "#EF4444" },
  "Giải trí": { icon: "🎬", color: "#F59E0B" },
  "Khác": { icon: "✨", color: "#8B5CF6" },
};

export const Route = createFileRoute("/chi-tieu_/them")({
  component: AddExpensePage,
});

function AddExpensePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");

  const ctxQ = useQuery({
    queryKey: ["my-context"],
    queryFn: () => getMyContext(),
    staleTime: 5 * 60_000,
  });
  const familyId = ctxQ.data?.family?.id;

  const addM = useMutation({
    mutationFn: (data: any) => createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", familyId] });
      toast.success("Đã thêm khoản chi");
      navigate({ to: "/chi-tieu", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) {
      toast.error("Không tìm thấy thông tin gia đình");
      return;
    }
    if (!title || !amount) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    addM.mutate({
      family_id: familyId,
      title,
      amount: parseInt(amount, 10),
      category,
      spent_on: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <MobileShell>
      <PageHeader eyebrow="Chi tiêu" title="Thêm khoản chi" back="/chi-tieu" />
      <div className="px-4 mt-4">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>Tên khoản chi</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ví dụ: Mua gạo" 
              required 
              className="h-11" 
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Số tiền (VNĐ)</Label>
            <Input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="500000" 
              required 
              className="h-11" 
            />
          </div>
          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORY_META).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_META[c].icon} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl bg-brand text-white font-semibold mt-4" 
            disabled={addM.isPending}
          >
            {addM.isPending ? "Đang lưu..." : "Lưu khoản chi"}
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}
