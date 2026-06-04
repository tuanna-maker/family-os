import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import {
  FormScreen,
  FormField,
  FormTextInput,
  FormPrimaryButton,
} from "@shared/ui/common/form-fields";
import { InlineSelect } from "@shared/ui/common/inline-select";
import { toast } from "sonner";
import { albumCategories, type AlbumCategory } from "@/features/family-core/memories/data";
import { useFamilyContext } from "@/hooks/use-family-context";
import { createAlbum } from "@/api/albums";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/ky-niem-gia-dinh_/album_/tao")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Tạo album — STOS Life" }] }),
  component: CreateAlbumPage,
});

function CreateAlbumPage() {
  const navigate = useNavigate();
  const { familyId } = useFamilyContext();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AlbumCategory>("Ngày đặc biệt");

  const createMut = useMutation({
    mutationFn: () => {
      const catData = albumCategories.find((c) => c.key === category);
      return createAlbum({
        family_id: familyId!,
        title: title.trim(),
        category,
        cover_emoji: catData?.emoji ?? "📁",
      });
    },
    onSuccess: (res) => {
      toast.success("Đã tạo album");
      navigate({
        to: "/ky-niem-gia-dinh/album/$albumId",
        params: { albumId: res.album.id },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên album");
      return;
    }
    if (!familyId) {
      toast.error("Chưa có hộ gia đình");
      return;
    }
    createMut.mutate();
  };

  const categoryOptions = albumCategories.map((c) => ({
    value: c.key,
    label: c.key,
    icon: c.emoji,
  }));

  return (
    <MobileShell>
      <PageHeader eyebrow="Kỷ niệm" title="Tạo album" back="/ky-niem-gia-dinh/album" />
      <form onSubmit={handleCreate}>
        <FormScreen
          footer={
            <FormPrimaryButton type="submit" disabled={createMut.isPending || !familyId}>
              {createMut.isPending ? "Đang lưu…" : "Tạo album"}
            </FormPrimaryButton>
          }
        >
          <FormField label="Tên album">
            <FormTextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Chuyến đi Phú Quốc"
              required
              autoFocus
            />
          </FormField>
          <InlineSelect
            label="Danh mục"
            value={category}
            onChange={(v) => setCategory(v as AlbumCategory)}
            options={categoryOptions}
          />
        </FormScreen>
      </form>
    </MobileShell>
  );
}
