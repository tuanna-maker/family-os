import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ShoppingBag, Refrigerator } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, ErrorState, EmptyState } from "@shared/ui/common/States";
import { Button } from "@shared/ui/ui/button";
import { Link } from "@tanstack/react-router";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listFood, toggleShopping, deleteFoodRow } from "@/api/food";
import { createFamilyServiceRequest } from "@/api/service-requests";

export function ShoppingAssistLive() {
  const navigate = useNavigate();
  const { familyId, isLoading: famLoading } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["food", familyId],
    queryFn: () => listFood({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const goForm = (id?: string) => {
    navigate({
      to: "/mua-sam-ho/them",
      search: id ? { id } : {},
    });
  };

  const requestMut = useMutation({
    mutationFn: () =>
      createFamilyServiceRequest({
        family_id: familyId!,
        title: "Yêu cầu mua sắm hộ",
        description: "Gia đình cần BQL / đối tác hỗ trợ mua hộ theo danh sách trong app.",
        category: "shopping",
        priority: "normal",
      }),
    onSuccess: () => toast.success("Đã gửi yêu cầu mua hộ — sẽ có người liên hệ"),
    onError: (e: Error) => toast.error(e.message),
  });

  const tgMut = useMutation({
    mutationFn: (v: { id: string; purchased: boolean }) => toggleShopping(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food", familyId] }),
  });

  const delMut = useMutation({
    mutationFn: (v: { id: string }) => deleteFoodRow({ table: "shopping_items", id: v.id }),
    onSuccess: () => {
      toast.success("Đã xoá");
      qc.invalidateQueries({ queryKey: ["food", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shopping = q.data?.shopping ?? [];
  const pending = shopping.filter((s) => !s.purchased);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Dịch vụ gia đình"
        title="Mua sắm hộ"
        subtitle="Danh sách cần mua & đặt người mua hộ"
        emoji="🛒"
        back="/gia-dinh"
      />

      {(famLoading || q.isLoading) && (
        <section className="px-4 mt-4">
          <LoadingState />
        </section>
      )}
      {q.isError && (
        <section className="px-4">
          <ErrorState message={(q.error as Error).message} />
        </section>
      )}

      {q.data && familyId && (
        <>
          <section className="px-4 mt-4">
            <RoundedCard className="p-4 bg-tint-purple/30 border-brand/20">
              <div className="flex gap-3">
                <div className="h-11 w-11 rounded-2xl bg-card grid place-items-center shrink-0">
                  <ShoppingBag className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Đặt người mua hộ</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Gửi yêu cầu tới Ban quản lý theo danh sách bên dưới.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 rounded-xl"
                    disabled={pending.length === 0 || requestMut.isPending}
                    onClick={() => requestMut.mutate()}
                  >
                    {requestMut.isPending ? "Đang gửi…" : "Gửi yêu cầu mua hộ"}
                  </Button>
                </div>
              </div>
            </RoundedCard>
          </section>

          <section className="px-4 mt-5">
            <SectionHeader
              title="Danh sách cần mua"
              subtitle={`${pending.length} chưa mua · ${shopping.length} tổng`}
              action={
                <button
                  type="button"
                  onClick={() => goForm()}
                  className="h-8 px-3 rounded-xl bg-brand text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm
                </button>
              }
            />
            {shopping.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-5 w-5" />}
                title="Chưa có món cần mua"
                description="Thêm món để lập danh sách đi chợ hoặc gửi mua hộ."
              />
            ) : (
              <RoundedCard className="p-0 divide-y divide-border">
                {shopping.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      checked={s.purchased}
                      onChange={(e) => tgMut.mutate({ id: s.id, purchased: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          s.purchased ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {s.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {[s.qty && `${s.qty}${s.unit ?? ""}`, s.category].filter(Boolean).join(" • ") || "—"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => goForm(s.id)}
                        className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Xoá món khỏi danh sách?")) delMut.mutate({ id: s.id });
                        }}
                        className="h-8 w-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </RoundedCard>
            )}
          </section>

          <section className="px-4 mt-6 pb-8">
            <Link
              to="/thuc-pham"
              className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card active:bg-muted/40"
            >
              <Refrigerator className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Thực phẩm & Tủ lạnh</p>
                <p className="text-[11px] text-muted-foreground">Tồn kho, hạn dùng, gợi ý bữa ăn</p>
              </div>
              <span className="text-muted-foreground">›</span>
            </Link>
          </section>
        </>
      )}
    </MobileShell>
  );
}
