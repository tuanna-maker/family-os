import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode, Plus, CheckCircle2, Pencil } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { Button } from "@shared/ui/ui/button";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  getHelperBundle,
  issueHelperShiftToken,
  listHelpers,
  setHelperAttendance,
  toggleHelperTask,
} from "@/api/helpers";
import { QrCodeImage } from "@/components/QrCodeImage";
import { formatVND } from "@shared/utils/formatters";
import { toast } from "sonner";

export function HelperLivePage() {
  const navigate = useNavigate();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const goForm = (type: "helper" | "task" | "attendance" | "qr", helperId?: string, id?: string) => {
    navigate({
      to: "/quan-ly-giup-viec/them",
      search: { type, ...(helperId ? { helperId } : {}), ...(id ? { id } : {}) },
    });
  };

  const helpersQ = useQuery({
    queryKey: ["family-helpers", familyId],
    queryFn: () => listHelpers({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const helpers = helpersQ.data ?? [];
  const activeId = selectedId ?? helpers[0]?.id ?? null;

  const bundleQ = useQuery({
    queryKey: ["helper-bundle", activeId],
    queryFn: () => getHelperBundle({ helper_id: activeId! }),
    enabled: !!activeId,
  });

  const selected = useMemo(() => helpers.find((h: any) => h.id === activeId), [helpers, activeId]);

  const issueQrMut = useMutation({
    mutationFn: (kind: "check_in" | "check_out") => issueHelperShiftToken({ helper_id: activeId!, kind }),
    onSuccess: (res) => {
      setIssuedToken(res.token);
      toast.success("Đã tạo mã QR ca");
      qc.invalidateQueries({ queryKey: ["helper-bundle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const taskToggleMut = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => toggleHelperTask(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["helper-bundle"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const markPresentMut = useMutation({
    mutationFn: () =>
      setHelperAttendance({
        helper_id: activeId!,
        att_date: new Date().toISOString().slice(0, 10),
        status: "present",
      }),
    onSuccess: () => {
      toast.success("Đã điểm danh");
      qc.invalidateQueries({ queryKey: ["helper-bundle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = (bundleQ.data as any)?.attendance?.find((a: { att_date: string }) => a.att_date === today);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Gia đình"
        title="Quản lý giúp việc"
        subtitle="Hồ sơ, điểm danh và QR ca làm"
        emoji="🧹"
        back="/gia-dinh"
        right={
          <button
            type="button"
            onClick={() => goForm("helper")}
            className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center"
            aria-label="Thêm giúp việc"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      {famLoading || helpersQ.isLoading ? (
        <div className="px-4 mt-4">
          <LoadingState />
        </div>
      ) : !familyId ? (
        <EmptyState title="Chưa có hộ gia đình" />
      ) : helpers.length === 0 ? (
        <section className="px-4 mt-6">
          <EmptyState title="Chưa có hồ sơ giúp việc" description="Thêm người giúp việc để quản lý ca và QR." />
          <Button className="w-full mt-4 rounded-2xl h-12" onClick={() => goForm("helper")}>
            Thêm giúp việc
          </Button>
        </section>
      ) : (
        <>
          <section className="px-4 mt-4 flex gap-2 overflow-x-auto pb-1">
            {helpers.map((h: any) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedId(h.id)}
                className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold border ${
                  activeId === h.id ? "bg-brand text-white border-brand" : "bg-card border-border"
                }`}
              >
                {h.avatar} {h.name}
              </button>
            ))}
          </section>

          {selected && (
            <section className="px-4 mt-4 space-y-4 pb-8">
              <RoundedCard className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{selected.name}</p>
                    <p className="text-sm text-muted-foreground">{selected.role ?? "Giúp việc"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goForm("helper", undefined, selected.id)}
                    className="h-9 w-9 rounded-xl border border-border grid place-items-center"
                    aria-label="Sửa hồ sơ"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm mt-2">{selected.phone ?? "—"}</p>
                <p className="text-sm font-semibold mt-2">{formatVND(selected.salary)}/tháng</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => markPresentMut.mutate()} disabled={markPresentMut.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Điểm danh hôm nay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate({
                        to: "/quet-ma",
                        search: { type: "helper", redirect: "/quan-ly-giup-viec" },
                      })
                    }
                  >
                    <QrCode className="h-4 w-4 mr-1" /> Quét QR
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => goForm("qr", activeId!)}>
                    Nhập tay
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => goForm("attendance", activeId!)}>
                    Chấm công khác ngày
                  </Button>
                </div>
                {todayAtt && (
                  <p className="text-[11px] text-success mt-2">Hôm nay: {todayAtt.status}</p>
                )}
              </RoundedCard>

              <SectionHeader title="QR ca làm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => issueQrMut.mutate("check_in")} disabled={issueQrMut.isPending}>
                  Phát mã vào ca
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => issueQrMut.mutate("check_out")}
                  disabled={issueQrMut.isPending}
                >
                  Phát mã ra ca
                </Button>
              </div>
              {issuedToken && (
                <RoundedCard className="p-4 space-y-3 text-center">
                  <QrCodeImage value={issuedToken} size={180} />
                  <p className="font-mono text-[10px] break-all text-muted-foreground">{issuedToken}</p>
                </RoundedCard>
              )}

              <SectionHeader
                title="Công việc hôm nay"
                action={
                  <button type="button" className="text-xs font-semibold text-brand" onClick={() => goForm("task", activeId!)}>
                    + Thêm
                  </button>
                }
              />
              <div className="space-y-2">
                {((bundleQ.data as any)?.tasks ?? []).map((t: { id: string; title: string; done: boolean }) => (
                  <RoundedCard key={t.id} className="p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => taskToggleMut.mutate({ id: t.id, done: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </span>
                    {t.done && <CheckCircle2 className="h-4 w-4 text-success" />}
                  </RoundedCard>
                ))}
                {((bundleQ.data as any)?.tasks ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có việc hôm nay</p>
                )}
              </div>

              <SectionHeader title="Nhật ký gần đây" />
              <div className="space-y-2">
                {((bundleQ.data as any)?.activity ?? []).slice(0, 8).map((a: { id: string; title: string; created_at: string }) => (
                  <RoundedCard key={a.id} className="p-3">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </p>
                  </RoundedCard>
                ))}
                {((bundleQ.data as any)?.activity ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có hoạt động</p>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </MobileShell>
  );
}
