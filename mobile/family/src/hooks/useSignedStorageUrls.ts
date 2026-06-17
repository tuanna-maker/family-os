import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@shared/supabase/get-client";

const SIGNED_TTL = 60 * 60 * 24 * 7;

function extractPublicStoragePath(bucket: string, url: string): string | null {
  // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  const path = url.slice(idx + marker.length);
  return path ? decodeURIComponent(path) : null;
}

function needsSigning(bucket: string, url: string) {
  if (!url) return false;
  if (url.includes("/storage/v1/object/sign/")) return false;
  if (url.includes("token=")) return false;
  return extractPublicStoragePath(bucket, url) != null;
}

export function useSignedStorageUrls(bucket: string, urls: Array<string | null | undefined>) {
  const normalized = useMemo(() => urls.filter((u): u is string => !!u && typeof u === "string"), [urls]);
  const toSign = useMemo(() => normalized.filter((u) => needsSigning(bucket, u)), [bucket, normalized]);

  return useQuery({
    queryKey: ["signed-urls", bucket, toSign.join("|")],
    enabled: toSign.length > 0,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const supabase = getSupabase();
      const entries = await Promise.all(
        toSign.map(async (u) => {
          const path = extractPublicStoragePath(bucket, u);
          if (!path) return [u, u] as const;
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_TTL);
          if (error || !data?.signedUrl) return [u, u] as const;
          return [u, data.signedUrl] as const;
        }),
      );
      return new Map(entries);
    },
  });
}

