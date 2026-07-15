import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { upsertTripItem } from "@/api/trips";

const KIND_LABEL: Record<string, string> = {
  checklist: "Checklist",
  packing: "Đồ cần mang",
  budget: "Ngân sách chi tiết",
};

export function TripItemFormPage({
  tripId,
  kind,
}: {
  tripId: string;
  kind: "checklist" | "packing" | "budget";
}) {
  const navigate = useNavigate();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const saveMut = useMutation({
    mutationFn: () =>
      upsertTripItem({
        trip_id: tripId,
        kind,
        label: label.trim(),
        amount: kind === "budget" ? Number(amount) || 0 : undefined,
      }),
    onSuccess: () => {
      toast.success("Đã thêm");
      navigate({ to: "/du-lich" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader eyebrow="Du lịch" title={`Thêm — ${KIND_LABEL[kind]}`} back="/du-lich" />
      <form
        className="px-4 mt-4 pb-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          saveMut.mutate();
        }}
      >
        <div>
          <Label>Nội dung</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" autoFocus />
        </div>
        {kind === "budget" && (
          <div>
            <Label>Số tiền (đ)</Label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
        )}
        <Button type="submit" className="w-full h-11 rounded-xl" disabled={!label.trim() || saveMut.isPending}>
          {saveMut.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
      </form>
    </MobileShell>
  );
}
