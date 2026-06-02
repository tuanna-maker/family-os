import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, Home, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileShell } from "@/components/mobile/MobileShell";
import { getMyContext, updateMyFamily } from "@/lib/auth.functions";
import { createInvite } from "@/lib/household-invite.functions";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/gia-dinh_/onboarding")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Thiết lập hộ gia đình — STOS Life" }] }),
  component: OnboardingWizard,
});

const STEPS = [
  { key: "name", label: "Tên hộ", icon: Users },
  { key: "apartment", label: "Căn hộ", icon: Home },
  { key: "invite", label: "Mời thành viên", icon: UserPlus },
] as const;

function OnboardingWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ctxFn = useServerFn(getMyContext);
  const updateFn = useServerFn(updateMyFamily);
  const inviteFn = useServerFn(createInvite);

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => ctxFn(),
    staleTime: 60_000,
  });

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [apartment, setApartment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ctx?.family) {
      setName((cur) => cur || ctx.family!.name);
      setApartment((cur) => cur || ctx.family!.apartment || "");
    }
  }, [ctx]);

  if (isLoading) {
    return (
      <MobileShell>
        <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
      </MobileShell>
    );
  }

  if (!ctx?.family) {
    return (
      <MobileShell>
        <div className="p-6 text-sm text-muted-foreground">Không tìm thấy hộ gia đình.</div>
      </MobileShell>
    );
  }

  const familyId = ctx.family.id;
  const isOwner = ctx.family.owner_id === ctx.userId;

  if (!isOwner) {
    return (
      <MobileShell>
        <div className="p-6 space-y-3">
          <h1 className="text-lg font-bold">Chỉ chủ hộ mới chỉnh sửa được</h1>
          <p className="text-sm text-muted-foreground">
            Bạn không phải chủ hộ của <b>{ctx.family.name}</b>. Vui lòng liên hệ chủ hộ để cập nhật thông tin.
          </p>
          <Button asChild variant="outline"><Link to="/gia-dinh">Về trang Gia đình</Link></Button>
        </div>
      </MobileShell>
    );
  }

  async function saveStep1() {
    if (!name.trim()) { toast.error("Nhập tên hộ"); return; }
    setSubmitting(true);
    try {
      await updateFn({ data: { familyId, name: name.trim() } });
      await qc.invalidateQueries({ queryKey: ["my-context"] });
      setStep(1);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  }

  async function saveStep2() {
    if (!apartment.trim()) { toast.error("Nhập mã căn hộ"); return; }
    setSubmitting(true);
    try {
      await updateFn({ data: { familyId, apartment: apartment.trim() } });
      await qc.invalidateQueries({ queryKey: ["my-context"] });
      setStep(2);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) { finish(); return; }
    setSubmitting(true);
    try {
      await inviteFn({
        data: { householdId: familyId, invitedEmail: inviteEmail.trim(), role: "family_member" },
      });
      toast.success("Đã gửi lời mời");
      finish();
    } catch (e) { toast.error((e as Error).message); setSubmitting(false); }
  }

  function finish() {
    toast.success("Hoàn tất thiết lập hộ");
    navigate({ to: "/gia-dinh" });
  }

  return (
    <MobileShell>
      <header className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Link to="/gia-dinh" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[17px] font-bold">Thiết lập hộ gia đình</h1>
      </header>

      {/* Stepper */}
      <div className="px-4 mt-2 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.key} className="flex-1 flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${
                  done ? "bg-success text-white" : active ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 ${done ? "bg-success" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="px-4 mt-2 text-[12px] text-muted-foreground">
        Bước {step + 1}/{STEPS.length}: {STEPS[step].label}
      </p>

      <section className="px-4 mt-5 space-y-4">
        {step === 0 && (
          <>
            <div className="space-y-2">
              <Label>Tên hộ gia đình</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Gia đình anh Minh"
                maxLength={120}
              />
              <p className="text-[11px] text-muted-foreground">
                Tên này hiển thị trên trang Gia đình & trong các lời mời.
              </p>
            </div>
            <Button className="w-full" onClick={saveStep1} disabled={submitting}>
              Tiếp tục
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>Mã/Số căn hộ</Label>
              <Input
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="VD: A1-1203"
                maxLength={120}
              />
              <p className="text-[11px] text-muted-foreground">
                Dùng để liên kết hộ với toà nhà, hỗ trợ SOS & dịch vụ tại nhà.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Quay lại</Button>
              <Button className="flex-1" onClick={saveStep2} disabled={submitting}>Tiếp tục</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>Email người thân (tuỳ chọn)</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="vidu@gmail.com"
                maxLength={255}
              />
              <p className="text-[11px] text-muted-foreground">
                Bạn có thể bỏ qua và mời sau ở mục "Mời thành viên".
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Quay lại</Button>
              <Button className="flex-1" onClick={sendInvite} disabled={submitting}>
                {inviteEmail.trim() ? "Gửi lời mời & hoàn tất" : "Bỏ qua & hoàn tất"}
              </Button>
            </div>
          </>
        )}
      </section>
    </MobileShell>
  );
}
