import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import { RoundedCard } from "@shared/ui/common/RoundedCard";
import { LoadingState, EmptyState } from "@shared/ui/common/States";
import { useFamilyContext } from "@/hooks/use-family-context";
import { getAlbum } from "@/api/albums";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/ky-niem-gia-dinh_/album/$albumId")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Album — STOS Life" }] }),
  component: AlbumDetailRoute,
});

function AlbumDetailRoute() {
  const { albumId } = Route.useParams();
  const { familyId, isLoading: famLoading } = useFamilyContext();

  const q = useQuery({
    queryKey: ["family-album", albumId, familyId],
    queryFn: () => getAlbum({ album_id: albumId, family_id: familyId! }),
    enabled: !!familyId,
  });

  const album = q.data?.album;
  const moments = q.data?.moments ?? [];

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Album"
        title={album?.title ?? "…"}
        subtitle={album?.category ?? undefined}
        emoji={album?.cover_emoji ?? "📁"}
        back="/ky-niem-gia-dinh/album"
      />

      <section className="px-4 mt-4">
        {famLoading || q.isLoading ? (
          <LoadingState />
        ) : !album ? (
          <EmptyState title="Không tìm thấy album" />
        ) : moments.length === 0 ? (
          <EmptyState
            title="Album trống"
            description="Tải ảnh và gán vào album khi đăng."
            action={
              <Link
                to="/ky-niem-gia-dinh/upload"
                search={{ album_id: albumId }}
                className="text-sm font-semibold text-brand mt-2 inline-block"
              >
                Tải ảnh vào album
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {moments.map((m) => (
              <Link
                key={m.id}
                to="/ky-niem-gia-dinh/$momentId"
                params={{ momentId: m.id }}
              >
                <RoundedCard className="overflow-hidden p-0">
                  <img
                    src={m.media_url}
                    alt={m.caption ?? ""}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                </RoundedCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </MobileShell>
  );
}
