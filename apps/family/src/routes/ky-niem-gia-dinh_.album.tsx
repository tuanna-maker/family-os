import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { useFamilyContext } from "@/hooks/use-family-context";
import { listAlbums } from "@/api/albums";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/ky-niem-gia-dinh_/album")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Album gia đình — STOS Life" }] }),
  component: AlbumListPage,
});

function AlbumListPage() {
  const { familyId, isLoading: famLoading } = useFamilyContext();

  const q = useQuery({
    queryKey: ["family-albums", familyId],
    queryFn: () => listAlbums({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const albums = q.data?.albums ?? [];

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Kỷ niệm"
        title="Album"
        back="/ky-niem-gia-dinh"
        right={
          <Link
            to="/ky-niem-gia-dinh/album/tao"
            className="h-10 w-10 rounded-2xl bg-brand text-white grid place-items-center"
            aria-label="Tạo album"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <section className="px-4 mt-4 pb-8">
        {famLoading || q.isLoading ? (
          <LoadingState />
        ) : !familyId ? (
          <EmptyState title="Chưa có hộ gia đình" />
        ) : albums.length === 0 ? (
          <EmptyState
            title="Chưa có album"
            description="Gom ảnh theo chuyến đi, sinh nhật…"
            action={
              <Link
                to="/ky-niem-gia-dinh/album/tao"
                className="text-sm font-semibold text-brand mt-2 inline-block"
              >
                Tạo album đầu tiên
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {albums.map((a) => (
              <Link
                key={a.id}
                to="/ky-niem-gia-dinh/album/$albumId"
                params={{ albumId: a.id }}
              >
                <RoundedCard className="p-4 flex items-center gap-3">
                  <span className="text-3xl">{a.cover_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.category ?? "Album"} · {a.moment_count ?? 0} ảnh
                    </p>
                  </div>
                </RoundedCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </MobileShell>
  );
}
