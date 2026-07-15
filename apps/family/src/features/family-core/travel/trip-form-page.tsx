import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { Button } from "@shared/ui/ui/button";
import { Input } from "@shared/ui/ui/input";
import { Label } from "@shared/ui/ui/label";
import { upsertTrip, type FamilyTrip } from "@/api/trips";

export function TripFormPage({
  familyId,
  trip,
}: {
  familyId: string;
  trip?: FamilyTrip;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(trip?.title ?? "");
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [startDate, setStartDate] = useState(trip?.start_date ?? "");
  const [endDate, setEndDate] = useState(trip?.end_date ?? "");
  const [members, setMembers] = useState(String(trip?.members_count ?? 2));
  const [budget, setBudget] = useState(String(trip?.budget_planned ?? 0));

  const saveMut = useMutation({
    mutationFn: () =>
      upsertTrip({
        id: trip?.id,
        family_id: familyId,
        title: title.trim(),
        destination: destination.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        members_count: Number(members) || 1,
        budget_planned: Number(budget) || 0,
        status: trip?.status ?? "planning",
      }),
    onSuccess: () => {
      toast.success(trip ? "Đã cập nhật" : "Đã tạo chuyến đi");
      navigate({ to: "/du-lich" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Du lịch"
        title={trip ? "Sửa chuyến đi" : "Chuyến đi mới"}
        back="/du-lich"
      />
      <form
        className="px-4 mt-4 pb-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          saveMut.mutate();
        }}
      >
        <div>
          <Label>Tên chuyến đi</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Phú Quốc hè 2026" className="mt-1" />
        </div>
        <div>
          <Label>Điểm đến</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Ngày đi</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Ngày về</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Số người</Label>
            <Input type="number" min={1} value={members} onChange={(e) => setMembers(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Ngân sách (đ)</Label>
            <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 rounded-xl" disabled={!title.trim() || saveMut.isPending}>
          {saveMut.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
      </form>
    </MobileShell>
  );
}
